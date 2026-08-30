import { NextResponse } from "next/server";

// Lead signé → fiche Propriétaire + fiche Appartement.
//
// Pourquoi (30/08/2026) : passer un lead à « Signé » ne déclenchait RIEN. Vérifié en
// production — aucun workflow n8n ne touche la table Leads, aucune automatisation
// Airtable non plus, et le champ « Propriétaire créé » prévu pour ça était vide sur
// les 50 leads. Tout le report était donc manuel, sans lien entre le lead et ce qu'il
// était devenu.
//
// Deux règles arbitrées par Vincent :
//   - l'appartement naît « En cours de signature » : le mandat est acquis, le contrat
//     propriétaire reste à faire signer. Il est donc hors parc, donc hors calcul de
//     disponibilité et hors catalogue tant que le contrat n'est pas signé.
//   - le contrat DocuSign NE PART PAS tout seul. Un lead passé à « Signé » par erreur
//     enverrait un contrat à un vrai propriétaire, sans retour possible. Le bouton
//     « Envoie contrat proprio » existe sur la fiche, c'est Vincent qui clique.
//
// Ce qu'on ne recopie pas, volontairement : le loyer. Le lead porte une estimation
// (« Estimation MIP min/max »), pas un montant contractuel — l'écrire dans « Loyer
// propriétaire / mois » ferait entrer une hypothèse dans les calculs de marge. Les
// estimations partent dans les Notes de l'appartement, à titre d'historique.

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BLK75UCAG"; // #leads, le canal de l'équipe commerciale

const T_LEADS = "tblUxEm8sB4eHyNG1";
const T_PROPRIETAIRES = "tblnUwaeTFk79O0dS";
const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";

type Rec = { id: string; fields: Record<string, unknown> };

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} → HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function lire(table: string, champs: string[], formule?: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    for (const c of champs) q.append("fields[]", c);
    if (formule) q.set("filterByFormula", formule);
    if (offset) q.set("offset", offset);
    const d = await airtable("GET", `${table}?${q}`);
    out.push(...(d.records ?? []));
    offset = d.offset ?? "";
  } while (offset);
  return out;
}

async function slack(texte: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: texte }),
  }).catch(() => {});
}

const texte = (v: unknown) => (v == null ? "" : String(v)).trim();

// « 25, rue de Lille - 75007 Paris » → rue / code postal / ville.
// Le code postal sert de pivot : c'est le seul élément fiable d'une saisie libre.
// Sans lui on ne devine rien, on met tout dans l'adresse et on laisse le reste vide.
function decouperAdresse(brut: string) {
  const s = brut.replace(/\s+/g, " ").trim();
  const m = s.match(/^(.*?)[\s,–-]*\b(\d{5})\b\s*(.*)$/);
  if (!m) return { adresse: s, cp: "", ville: "" };
  return {
    adresse: m[1].replace(/[\s,–-]+$/, "").trim(),
    cp: m[2],
    ville: m[3].replace(/^[\s,–-]+/, "").trim(),
  };
}

const nombre = (v: unknown) => {
  const n = parseFloat(texte(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
// « oui », « Oui », « avec ascenseur » → vrai. Tout le reste, y compris vide, → faux.
const ouiNon = (v: unknown) => /\b(oui|yes|avec)\b/i.test(texte(v));

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";

  // Un lead déjà rattaché à un propriétaire a été traité : c'est l'idempotence.
  const leads = (await lire(
    T_LEADS,
    ["Code lead", "Statut", "Civilité", "Prénom", "Nom", "Email", "Téléphone",
     "Adresse du bien", "Surface (m²)", "Pièces", "Étage", "Chambres", "SdB",
     "Ascenseur", "État", "Message", "Source formulaire", "Loyer marché (€/mois)",
     "Estimation MIP min (€/mois)", "Estimation MIP max (€/mois)", "Propriétaire créé"],
    "{Statut}='Signé'"
  )).filter((l) => !((l.fields["Propriétaire créé"] as unknown[] | undefined) ?? []).length);

  if (!leads.length) {
    return NextResponse.json({ ok: true, traites: 0, message: "aucun lead signé en attente" });
  }

  const proprios = await lire(T_PROPRIETAIRES, ["Email", "Nom", "Prénom"]);
  const parEmail = new Map<string, string>();
  for (const p of proprios) {
    const e = texte(p.fields["Email"]).toLowerCase();
    if (e && !parEmail.has(e)) parEmail.set(e, p.id);
  }

  const faits: Record<string, unknown>[] = [];

  for (const lead of leads) {
    const f = lead.fields;
    const code = texte(f["Code lead"]);
    const email = texte(f["Email"]).toLowerCase();
    const prenom = texte(f["Prénom"]);
    const nom = texte(f["Nom"]);
    const nomComplet = `${prenom} ${nom}`.trim() || email || code;

    if (simulation) {
      const a = decouperAdresse(texte(f["Adresse du bien"]));
      faits.push({ lead: code, proprietaire: nomComplet,
        proprietaireExistant: email ? parEmail.has(email) : false, ...a });
      continue;
    }

    // ── Propriétaire : on réutilise la fiche existante si l'email correspond,
    // sinon on la crée. Créer un doublon casserait les liens et les virements.
    let proprioId = email ? parEmail.get(email) : undefined;
    let proprioCree = false;
    if (!proprioId) {
      const r = await airtable("POST", T_PROPRIETAIRES, {
        records: [{ fields: {
          "Nom": nom, "Prénom": prenom, "Email": texte(f["Email"]) || undefined,
          "Téléphone": texte(f["Téléphone"]) || undefined,
          "Statut contrat": "En cours de signature",
          "Notes": `Créé depuis le lead ${code} (${texte(f["Source formulaire"]) || "source inconnue"}).`,
        } }],
        typecast: true,
      });
      proprioId = r.records[0].id;
      proprioCree = true;
      if (email) parEmail.set(email, proprioId!);
    }

    // ── Appartement. « Nom / Référence » reçoit la rue faute de mieux : la typologie
    // du lead est un texte libre, la déduire produirait de faux « T2 ». À renommer.
    const { adresse, cp, ville } = decouperAdresse(texte(f["Adresse du bien"]));
    const notes = [
      `Créé depuis le lead ${code}.`,
      texte(f["Pièces"]) && `Pièces annoncées : ${texte(f["Pièces"])}.`,
      texte(f["SdB"]) && `Salles de bain : ${texte(f["SdB"])}.`,
      texte(f["État"]) && `État déclaré : ${texte(f["État"])}.`,
      nombre(f["Loyer marché (€/mois)"]) && `Loyer marché annoncé : ${nombre(f["Loyer marché (€/mois)"])} €.`,
      (nombre(f["Estimation MIP min (€/mois)"]) || nombre(f["Estimation MIP max (€/mois)"])) &&
        `Estimation MIP : ${nombre(f["Estimation MIP min (€/mois)"]) ?? "?"} à ${nombre(f["Estimation MIP max (€/mois)"]) ?? "?"} €. Estimation, PAS un loyer contractuel.`,
      texte(f["Message"]) && `Message du propriétaire : ${texte(f["Message"])}`,
    ].filter(Boolean).join("\n");

    const app = await airtable("POST", T_APPARTEMENTS, {
      records: [{ fields: {
        "Nom / Référence": adresse || texte(f["Adresse du bien"]) || code,
        "Adresse": adresse || texte(f["Adresse du bien"]),
        "Code postal": cp || undefined,
        "Ville": ville || undefined,
        "Surface m²": nombre(f["Surface (m²)"]) ?? undefined,
        "Nb chambres": nombre(f["Chambres"]) ?? undefined,
        "Étage": texte(f["Étage"]) || undefined,
        "Ascenseur": ouiNon(f["Ascenseur"]),
        "Statut pipeline": "En cours de signature",
        "Propriétaire": [proprioId],
        "Notes": notes,
      } }],
      typecast: true,
    });
    const appId = app.records[0].id;
    const appCode = texte(app.records[0].fields?.["Code appartement"]);

    await airtable("PATCH", T_LEADS, {
      records: [{ id: lead.id, fields: { "Propriétaire créé": [proprioId] } }],
      typecast: true,
    });

    faits.push({ lead: code, appartement: appCode || appId, proprietaire: nomComplet, proprioCree, cp, ville });

    await slack(
      `:white_check_mark: *Lead signé — ${nomComplet}*\n` +
      `${code} → appartement ${appCode || "créé"} · ${adresse || "adresse à compléter"}` +
      `${cp ? ` ${cp}` : ""}${ville ? ` ${ville}` : ""}\n` +
      `Propriétaire ${proprioCree ? "créé" : "existant, réutilisé"}. ` +
      `L'appartement est « En cours de signature » : il n'est pas commercialisé.\n` +
      `_Le contrat propriétaire ne part pas tout seul — bouton « Envoie contrat proprio » sur la fiche._`
    );
  }

  return NextResponse.json({ ok: true, simulation, traites: faits.length, faits });
}

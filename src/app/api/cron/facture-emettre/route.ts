import { NextResponse } from "next/server";

// Émission d'une facture créée à la main dans Airtable.
//
// Pourquoi (31/08/2026) : la table Factures ne savait rien émettre. Les factures y
// naissaient uniquement par les workflows (post-signature, batch mensuel, transfert,
// intervention), et le destinataire était toujours celui de la RÉSERVATION. Impossible
// donc de facturer ponctuellement un occupant qui paie une partie de son séjour de sa
// poche — le cas de M. LAPOIRIE — ni un dégât, ni des honoraires sans séjour.
//
// Le destinataire est désormais porté par la FACTURE elle-même, via « Facturer à ».
// La réservation reste facultative : elle ne sert plus qu'au suivi.
//
// DÉCLENCHEMENT : Vincent passe le Statut à « A envoyer ». C'est un geste délibéré,
// et c'est la seule chose qui déclenche une émission — jamais la simple création
// d'une ligne. Le webhook temps réel déjà posé sur la table réveille cette route dans
// la seconde ; un passage horaire rattrape ce qui aurait été manqué.
//
// LE CLIENT PENNYLANE EST CRÉÉ À LA VOLÉE, jamais à l'avance : un occupant n'obtient
// un identifiant Pennylane que le jour où on lui facture quelque chose, et cet
// identifiant est rangé dans sa fiche pour la facture suivante.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const PL_KEY = process.env.PENNYLANE_API_KEY || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CANAL = "C0BCH7FRDC2"; // #facturation

const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";

// Une facture émise ne se rattrape pas : on n'en passe jamais beaucoup d'un coup.
const MAX_PAR_PASSAGE = 5;
const TVA = "FR_200";
const ECHEANCE_JOURS = 30;

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };

// Qui reçoit la facture, selon « Facturer à ». « personne » décide de l'endpoint
// Pennylane : une personne physique n'a pas de raison sociale, une société n'a pas
// de prénom, et Pennylane refuse le mauvais gabarit.
const DESTINATAIRES: Record<string, {
  champLien: string; table: string; personne: boolean;
  nom: (f: Dict) => string; prenom?: (f: Dict) => string;
  email: (f: Dict) => string; adresse: (f: Dict) => string;
}> = {
  Occupant: {
    champLien: "Occupant lié", table: "tblgcFnDwxjqVJy8L", personne: true,
    nom: (f) => str(f["Nom"]), prenom: (f) => str(f["Prénom"]),
    email: (f) => str(f["Email"]), adresse: () => "",
  },
  "Client final": {
    champLien: "Client final liée", table: "tblIzSOniHXHCLWQJ", personne: false,
    nom: (f) => str(f["Nom client final"]),
    email: (f) => str(f["Email copie auto"]), adresse: (f) => str(f["Adresse"]),
  },
  "Propriétaire": {
    champLien: "Propriétaire lié", table: "tblnUwaeTFk79O0dS", personne: true,
    nom: (f) => str(f["Nom"]), prenom: (f) => str(f["Prénom"]),
    email: (f) => str(f["Email"]), adresse: (f) => str(f["Adresse fiscale"]),
  },
  Agence: {
    // La facture ne porte pas de lien direct vers l'agence : on la retrouve par la
    // réservation, seul endroit où l'entité agence est rattachée.
    champLien: "", table: "tblINIOlKNzndfDRX", personne: false,
    nom: (f) => str(f["Nom agence"]),
    email: (f) => str(f["Email principal"]), adresse: (f) => str(f["Adresse"]),
  },
};

const str = (v: unknown) => (v == null ? "" : String(v)).trim();
const premierLien = (v: unknown) => (Array.isArray(v) ? str(v[0]) : str(v)) || null;

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function pennylane(method: string, chemin: string, body?: unknown) {
  const r = await fetch(`https://app.pennylane.com/api/external/v2${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${PL_KEY}`, "Content-Type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Pennylane ${method} ${chemin} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

async function slack(texte: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CANAL, text: texte }),
  }).catch(() => {});
}

// Retrouve l'entité facturée et sa fiche Airtable, ou explique pourquoi c'est impossible.
async function resoudreDestinataire(fac: Rec) {
  const choix = str(fac.fields["Facturer à"]);
  if (!choix) throw new Error("« Facturer à » n'est pas renseigné");
  const conf = DESTINATAIRES[choix];
  if (!conf) throw new Error(`« Facturer à » = ${choix} : valeur inconnue`);

  let recId: string | null;
  if (choix === "Agence") {
    const resaId = premierLien(fac.fields["Réservation liée"]);
    if (!resaId) throw new Error("facturer une agence exige une réservation liée (c'est elle qui porte l'agence)");
    const resa = await airtable("GET", `${T_RESERVATIONS}/${resaId}`);
    recId = premierLien(resa.fields["Agence de relocation (entité)"]);
    if (!recId) throw new Error("la réservation n'a pas d'agence de relocation rattachée");
  } else {
    recId = premierLien(fac.fields[conf.champLien]);
    if (!recId) throw new Error(`« ${conf.champLien} » est vide alors que la facture vise ${choix.toLowerCase()}`);
  }
  const rec = await airtable("GET", `${conf.table}/${recId}`);
  return { choix, conf, rec: rec as Rec };
}

// L'identifiant Pennylane n'est créé que lorsqu'on facture réellement, et il est
// aussitôt rangé dans la fiche : la facture suivante réutilisera le même client.
async function clientPennylane(conf: typeof DESTINATAIRES[string], rec: Rec) {
  const existant = rec.fields["Pennylane customer ID"];
  if (typeof existant === "number" && existant > 0) return { id: existant, cree: false };

  const email = conf.email(rec.fields);
  if (!email) throw new Error("aucun email sur la fiche du destinataire : Pennylane en exige un");
  const billing_address = { address: conf.adresse(rec.fields), postal_code: "", city: "", country_alpha2: "FR" };
  const payload = conf.personne
    ? { emails: [email], first_name: conf.prenom?.(rec.fields) || "", last_name: conf.nom(rec.fields) || email, billing_address }
    : { emails: [email], name: conf.nom(rec.fields) || email, billing_address };
  const endpoint = conf.personne ? "individual_customers" : "company_customers";
  const cree = await pennylane("POST", `/${endpoint}?use_2026_api_changes=true`, payload);
  const id = Number(cree?.id);
  if (!id) throw new Error("Pennylane n'a pas renvoyé d'identifiant client");
  await airtable("PATCH", conf.table, { records: [{ id: rec.id, fields: { "Pennylane customer ID": id } }] });
  return { id, cree: true };
}

function libelle(fac: Rec) {
  const cat = str(fac.fields["Catégorie"]);
  const notes = str(fac.fields["Notes"]);
  const resa = Array.isArray(fac.fields["Code réservation (récap)"])
    ? str((fac.fields["Code réservation (récap)"] as unknown[])[0]).split(" · ")[0] : "";
  return [notes || cat || "Prestation", resa ? `Réservation ${resa}` : ""].filter(Boolean).join(" — ").slice(0, 250);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";
  if (!PL_KEY) return NextResponse.json({ ok: false, erreur: "PENNYLANE_API_KEY absente" }, { status: 500 });

  const q = new URLSearchParams({ pageSize: "100" });
  q.set("filterByFormula", "AND({Statut}='A envoyer', {Lien Pennylane}=BLANK())");
  const aEmettre: Rec[] = (await airtable("GET", `${T_FACTURES}?${q}`)).records ?? [];

  const faits: string[] = [];
  const refus: string[] = [];
  for (const fac of aEmettre.slice(0, MAX_PAR_PASSAGE)) {
    const num = str(fac.fields["Numéro facture"]) || fac.id;
    try {
      const montantHT = Number(fac.fields["Montant total HT"] ?? 0);
      if (!(montantHT > 0)) throw new Error("montant HT vide ou nul");
      const { choix, conf, rec } = await resoudreDestinataire(fac);

      if (simulation) {
        faits.push(`${num} → ${choix} « ${conf.nom(rec.fields)} » · ${montantHT} € HT · ${libelle(fac)}`);
        continue;
      }

      const client = await clientPennylane(conf, rec);
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const echeance = new Date(Date.now() + ECHEANCE_JOURS * 86400000).toISOString().slice(0, 10);
      const facture = await pennylane("POST", "/customer_invoices?use_2026_api_changes=true", {
        customer_id: client.id,
        date: aujourdhui,
        deadline: echeance,
        draft: str(fac.fields["Mode facturation"]) === "Proforma",
        currency: "EUR",
        invoice_lines: [{
          label: libelle(fac), quantity: 1, unit: "piece",
          raw_currency_unit_price: montantHT.toFixed(6), vat_rate: TVA,
        }],
      });
      const plId = Number(facture?.id);
      if (!plId) throw new Error("Pennylane n'a pas renvoyé d'identifiant de facture");

      await airtable("PATCH", T_FACTURES, { records: [{ id: fac.id, fields: {
        "Lien Pennylane": `https://app.pennylane.com/companies/22414705/clients/customer_invoices?invoice_id=${plId}&subtab=all`,
        "Date d'envoi": aujourdhui,
        Statut: "Envoyée",
      }}]});
      faits.push(`• ${num} → ${choix} « ${conf.nom(rec.fields)} » — ${montantHT.toLocaleString("fr-FR")} € HT${client.cree ? " _(client Pennylane créé)_" : ""}`);
    } catch (e) {
      refus.push(`• ${num} — ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!simulation && (faits.length || refus.length)) {
    await slack([
      faits.length ? `:receipt: *Facture(s) émise(s) depuis Airtable*\n${faits.join("\n")}` : "",
      refus.length ? `:warning: *Facture(s) non émises — à corriger*\n${refus.join("\n")}` : "",
    ].filter(Boolean).join("\n\n"));
  }

  return NextResponse.json({
    ok: true, simulation, candidates: aEmettre.length, emises: faits, refusees: refus,
    restantes: Math.max(0, aEmettre.length - MAX_PAR_PASSAGE),
  });
}

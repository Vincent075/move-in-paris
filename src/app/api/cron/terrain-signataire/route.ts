import { NextResponse } from "next/server";

// « Assignée à » → « Collaborateur », pour que chacun ne voie que son planning.
//
// LE PROBLÈME (31/08/2026, demande de Vincent) : dans les interfaces, Airtable ne
// sait filtrer sur « l'utilisateur connecté » QUE via un champ de type collaborateur.
// Le process de l'équipe, lui, passe par « Assignée à », un lien vers la table
// Utilisateurs — et il n'est pas question d'en changer : c'est ce champ qui porte les
// rollups, les onglets du planning et les habitudes de saisie.
//
// LA SOLUTION : on ne touche à rien côté saisie. On recopie simplement, à chaque
// changement, le compte Airtable de la personne assignée dans le champ technique
// « Collaborateur », que le filtre « utilisateur en cours » sait lire. Vincent assigne
// comme avant ; Noel, Elisandra et Lionel n'ouvrent que leur propre planning.
//
// INSTANTANÉ : appelé par le webhook temps réel Airtable dès qu'une ligne de Ménages
// ou de Check-in bouge, et par un cron horaire en filet. Écriture strictement
// sélective — si le collaborateur est déjà le bon, on n'écrit pas, ce qui évite de
// réveiller le webhook pour rien.
//
// LIMITE ASSUMÉE : un salarié sans compte Airtable (aujourd'hui Crispina, alias Edwin)
// ne peut pas être recopié — le champ collaborateur n'accepte que des comptes réels.
// Ses ménages restent visibles de tous tant qu'elle n'est pas invitée à l'interface.
// Le compte est signalé dans la réponse plutôt que de faire échouer la synchro.
//
// SUPERVISEUR : le filtre d'interface ne sait comparer qu'à « l'utilisateur en cours ».
// Pour que le responsable voie tout le planning dans Équipe Terrain sans que l'équipe
// voie celui des autres, chaque ligne porte aussi un superviseur — toujours le même —
// et le filtre devient « signataire OU superviseur = utilisateur en cours ».
//
// ?simulation=1 calcule sans écrire.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const T_UTILISATEURS = "tblCTaXoRZpJGSesQ";
// Qui voit l'intégralité du planning dans Équipe Terrain. Un champ collaborateur ne
// retient qu'UNE personne : il faut donc autant de champs « Superviseur N » que de
// responsables, et autant de conditions dans le filtre de l'interface. L'ordre compte,
// il détermine quel champ reçoit qui. Ajouter un quatrième responsable suppose de créer
// « Superviseur 4 » et d'ajouter la condition correspondante.
const SUPERVISEURS = [
  "vincent@move-in-paris.com",
  "Guillaume@move-in-paris.com",   // casse d'origine du compte Airtable, à respecter
  "stephane@move-in-paris.com",
];
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const LOT = 10;

// Les deux tables terrain et le champ d'assignation propre à chacune. Le féminin de
// « Assignée à » sur Ménages n'est pas une coquille : c'est le nom réel du champ.
const TABLES = [
  { id: "tblVE8HEtnuTeCi8r", nom: "Ménages", champ: "Assignée à", code: "Code ménage" },
  { id: "tbl8SktZKbyopdQ7l", nom: "Check-in", champ: "Assigné à", code: "Code check-in" },
];

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const liens = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path.slice(0, 40)} : HTTP ${r.status}`);
  return r.json();
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AT_TOKEN}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function monitoring(statut: string, detail: string) {
  const nom = "Synchro signataire terrain";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === nom);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail, "Dernière vérification": new Date().toISOString() };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas la synchro */ }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";
  const debut = Date.now();

  try {
    const utilisateurs = await lireTable(T_UTILISATEURS);
    // Un utilisateur ne donne un signataire que s'il a un vrai compte Airtable.
    const compte = new Map<string, { id: string; email: string }>();
    const sansCompte = new Set<string>();
    for (const u of utilisateurs) {
      const c = u.fields["Collaborateur"] as { id?: string; email?: string } | undefined;
      if (c?.id) compte.set(u.id, { id: c.id, email: texte(c.email) });
      else sansCompte.add(texte(u.fields["Code utilisateur"]));
    }

    // Les superviseurs sont des utilisateurs comme les autres : on prend leur compte
    // Airtable dans la table Utilisateurs, sans jamais coder d'identifiant en dur.
    const parEmail = new Map<string, string>();
    for (const u of utilisateurs) {
      const c = u.fields["Collaborateur"] as { id?: string; email?: string } | undefined;
      if (c?.id) parEmail.set(texte(c.email).toLowerCase(), c.id);
    }
    const superviseurs = SUPERVISEURS.map((e) => parEmail.get(e.toLowerCase()) ?? null);
    const superviseursManquants = SUPERVISEURS.filter((e) => !parEmail.has(e.toLowerCase()));

    const detailParTable: Record<string, { corriges: number; sans_compte: number }> = {};
    let total = 0;
    const bloques: string[] = [];

    for (const t of TABLES) {
      const recs = await lireTable(t.id);
      const aEcrire: { id: string; fields: Dict }[] = [];
      let bloque = 0;

      for (const r of recs) {
        const assignes = liens(r.fields[t.champ]);
        const actuel = (r.fields["Collaborateur"] as { id?: string } | undefined)?.id ?? null;
        // Les superviseurs ne dépendent pas de l'assignation : ils sont sur toutes les
        // lignes, chacun dans son champ.
        superviseurs.forEach((sid, i) => {
          if (!sid) return;
          const champ = `Superviseur ${i + 1}`;
          const actuelSup = (r.fields[champ] as { id?: string } | undefined)?.id ?? null;
          if (actuelSup !== sid) aEcrire.push({ id: r.id, fields: { [champ]: { id: sid } } });
        });

        if (!assignes.length) {
          // Plus personne d'assigné : on retire aussi le signataire, sinon la ligne
          // resterait visible chez quelqu'un qui n'y est plus pour rien.
          if (actuel) aEcrire.push({ id: r.id, fields: { Collaborateur: null } });
          continue;
        }
        const c = compte.get(assignes[0]);
        if (!c) {
          // Assigné à quelqu'un qui n'a pas de compte : on ne peut rien recopier.
          bloque++;
          if (bloques.length < 12) bloques.push(texte(r.fields[t.code]));
          continue;
        }
        if (actuel !== c.id) aEcrire.push({ id: r.id, fields: { Collaborateur: { id: c.id } } });
      }

      // Une ligne peut recevoir signataire ET superviseur : on fusionne, Airtable
      // rejette un lot qui contient deux fois le même enregistrement.
      const fusion = new Map<string, Dict>();
      for (const e of aEcrire) fusion.set(e.id, { ...(fusion.get(e.id) ?? {}), ...e.fields });
      const lots = [...fusion.entries()].map(([id, fields]) => ({ id, fields }));
      detailParTable[t.nom] = { corriges: lots.length, sans_compte: bloque };
      total += lots.length;

      if (!simulation) {
        for (let i = 0; i < lots.length; i += LOT) {
          await airtable("PATCH", t.id, { records: lots.slice(i, i + LOT), typecast: true });
        }
      }
    }

    const detail = `${total} ligne(s) alignée(s) · ` +
      Object.entries(detailParTable).map(([n, d]) => `${n} ${d.corriges}`).join(" · ") +
      (bloques.length ? ` · sans compte Airtable : ${[...sansCompte].join(", ")}` : "");
    if (!simulation) await monitoring(bloques.length ? "ALERTE" : "OK", detail);

    return NextResponse.json({
      ok: true, simulation,
      alignes: total,
      par_table: detailParTable,
      salaries_sans_compte_airtable: [...sansCompte],
      superviseurs_introuvables: superviseursManquants,
      exemples_non_synchronisables: bloques,
      duree_ms: Date.now() - debut,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Synchro signataire en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}

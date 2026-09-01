// Lecture du bloc de facturation L'Oréal collé dans les « Notes internes » d'une réservation.
//
// Pourquoi (01/09/2026) : c'est ce bloc, transmis par Santa Fe ou Dwellworks à chaque
// arrivée, qui porte les références sans lesquelles L'Oréal n'émet pas la DED — et sans
// DED, pas de facture définitive, donc pas de règlement. Le récap mensuel les lit ici.
//
// Le lecteur est volontairement TOLÉRANT : sur les dix blocs réels observés, aucun n'a
// exactement la même forme. On rencontre des tabulations, des deux-points, des tirets,
// des libellés français ou anglais, des valeurs entre parenthèses, un contact RH donné
// tantôt en clair tantôt en adresse email. Refuser un format, ici, c'est perdre une
// facture — donc on accepte tout ce qui est lisible et on signale ce qui manque.

export type BlocLoreal = {
  gpz?: string; entiteNom?: string; entiteCode?: string; businessUnit?: string;
  costCenter?: string; contactRh?: string; policy?: string; consultant?: string;
  champsLus: string[];
};

const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Un même champ porte jusqu'à cinq libellés différents selon l'expéditeur.
const CLES: { cle: keyof BlocLoreal; motifs: string[] }[] = [
  { cle: "gpz", motifs: ["gpz", "employee gpz", "matricule"] },
  { cle: "entiteNom", motifs: ["legal entity name", "legal entity which bears", "legal entity", "entite legale", "nom entite", "raison sociale"] },
  { cle: "entiteCode", motifs: ["legal entity code", "code entite legale", "code entite", "entity code"] },
  { cle: "businessUnit", motifs: ["business unit code", "business unit", "bu code", "bu"] },
  { cle: "costCenter", motifs: ["cost center", "costs center code", "centre de cout", "cost centre"] },
  { cle: "policy", motifs: ["l'oreal policy", "loreal policy", "policy", "assignment policy type", "politique"] },
  { cle: "contactRh", motifs: ["hr contact", "hr consultant", "contact rh", "l'oreal contact name", "loreal contact name"] },
  { cle: "consultant", motifs: ["santa fe consultant", "sf gmc", "dwellworks consultant", "consultant"] },
];

// « Juan.Betancur@loreal.com » → « Juan Betancur ». Le tableau L'Oréal attend un nom.
function nomLisible(v: string): string {
  if (!v.includes("@")) return v;
  const local = v.split("@")[0];
  return local.split(/[._-]+/).filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()).join(" ");
}

// PAS de « redressement » des codes. J'avais ajouté une correction automatique qui
// permutait code entité et business unit quand la paire semblait inversée. C'était une
// erreur : le 01/09/2026, Santa Fe a transmis pour M. LAPOIRIE un code entité MCD501C4
// identique à sa business unit, et un cost center 501000167 sans le A que portent les
// lignes voisines. Ce n'étaient pas des fautes de frappe, c'étaient ses références.
// Une référence client ne se déduit pas d'un motif : on recopie ce que l'agence envoie,
// et si quelque chose semble anormal on le signale, on ne le corrige pas.

export function lireBlocLoreal(notes: string | null | undefined): BlocLoreal | null {
  if (!notes || !/mandatory information|invoicing report|gpz/i.test(notes)) return null;
  const out: BlocLoreal = { champsLus: [] };
  for (const brut of notes.split(/\r?\n/)) {
    const ligne = brut.replace(/^[\s•\-*·]+/, "").trim();
    if (!ligne) continue;
    // séparateur : tabulation, deux-points ou tiret entouré d'espaces
    const m = ligne.match(/^(.{2,42}?)\s*(?:\t+|:|\s[-–]\s)\s*(.+)$/);
    if (!m) continue;
    const libelle = sansAccent(m[1]).replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
    let valeur = m[2].trim().replace(/\s{2,}/g, " ");
    if (!valeur || /^(n\/?a|tbc|none|-)$/i.test(valeur)) valeur = valeur.toUpperCase();
    let trouve: (keyof BlocLoreal) | null = null;
    let meilleur = 0;
    for (const { cle, motifs } of CLES) {
      for (const mo of motifs) {
        if (libelle === mo || libelle.startsWith(mo) || libelle.endsWith(mo)) {
          if (mo.length > meilleur) { meilleur = mo.length; trouve = cle; }
        }
      }
    }
    if (!trouve || out[trouve]) continue;
    (out as Record<string, unknown>)[trouve] =
      trouve === "contactRh" ? nomLisible(valeur) : valeur;
    out.champsLus.push(trouve);
  }
  if (!out.champsLus.length) return null;
  return out;
}

// Ce que L'Oréal exige sur chaque ligne du récap. Le reste est souhaitable, pas bloquant.
export const OBLIGATOIRES: (keyof BlocLoreal)[] =
  ["gpz", "entiteNom", "entiteCode", "businessUnit", "costCenter", "contactRh", "policy"];

export function manquants(b: BlocLoreal | null): string[] {
  if (!b) return OBLIGATOIRES as string[];
  return OBLIGATOIRES.filter((c) => !b[c]) as string[];
}

// Circuit de validation des congés et absences (04/09/2026, demande de Vincent).
//
// Le salarié pose sa demande depuis l'interface Équipe Terrain. Elle naît « En attente »
// et s'affiche aussitôt en ROUGE CLAIR sur son calendrier : il voit que c'est posé, mais
// rien n'est encore acquis. Vincent reçoit un email nominatif avec deux boutons. Son clic
// écrit la décision, repeint la ligne en VERT si c'est accepté, et déclenche l'email de
// réponse au salarié. Une demande refusée reste visible, en gris, avec son motif.
//
// RÈGLE ABSOLUE : seule une demande ACCEPTÉE est rattachée au mois de paie. Tant qu'elle
// est en attente, elle ne pèse pas un jour dans le compteur, sinon la comptable
// recevrait des congés que Vincent n'a jamais validés.

import { airtable, lireTable, lireEnregistrement, type Rec } from "@/lib/mip/courrier";

export const T_ABSENCES = "tblsR6InB8ou1O6y1";
export const T_CONGES = "tblUmXRTiRgRkO37C";
export const T_UTILISATEURS = "tblCTaXoRZpJGSesQ";

export const CHAMP_STATUT = "Statut demande";
export const CHAMP_JETON = "Jeton décision";
export const CHAMP_DEMANDE = "Demandé le";
export const CHAMP_DECIDE = "Décidé le";
export const CHAMP_MOTIF = "Motif du refus";
export const CHAMP_CALCUL = "Jours décomptés (calcul)";
export const CHAMP_COMMENTAIRE = "Commentaire salarié";

export const texte = (v: unknown): string => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" ? x : x == null ? "" : String(x);
};
export const nombre = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
export const liens = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => texte(x)).filter(Boolean) : []);

// ── Jours fériés français ───────────────────────────────────────────────────
// Calcul de Pâques (Meeus/Jones/Butcher) : les quatre fériés mobiles en découlent.
function paques(a: number): Date {
  const n = a % 19, c = Math.floor(a / 100), u = a % 100;
  const s = Math.floor(c / 4), t = c % 4, p = Math.floor((c + 8) / 25), q = Math.floor((c - p + 1) / 3);
  const e = (19 * n + c - s - q + 15) % 30, i = Math.floor(u / 4), k = u % 4;
  const l = (32 + 2 * t + 2 * i - e - k) % 7, m = Math.floor((n + 11 * e + 22 * l) / 451);
  const mois = Math.floor((e + l - 7 * m + 114) / 31), jour = ((e + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(a, mois - 1, jour));
}
const jourPlus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function feries(annee: number): Set<string> {
  const P = paques(annee);
  return new Set([
    `${annee}-01-01`, iso(jourPlus(P, 1)), `${annee}-05-01`, `${annee}-05-08`,
    iso(jourPlus(P, 39)), iso(jourPlus(P, 50)), `${annee}-07-14`, `${annee}-08-15`,
    `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`,
  ]);
}

// Décompte en JOURS OUVRABLES : du lundi au samedi, dimanches et jours fériés exclus.
// C'est le régime qui correspond aux 2,5 jours acquis par mois (30 jours par an,
// article L3141-3 du code du travail), celui appliqué chez Move in Paris.
export function joursOuvrables(debut: string, fin: string): number {
  const d1 = debut.slice(0, 10), d2 = (fin || debut).slice(0, 10);
  if (!d1 || !d2 || d2 < d1) return 0;
  let n = 0;
  const F = new Set<string>();
  for (let a = Number(d1.slice(0, 4)); a <= Number(d2.slice(0, 4)); a++) feries(a).forEach((x) => F.add(x));
  for (let d = new Date(`${d1}T00:00:00Z`); iso(d) <= d2; d = jourPlus(d, 1)) {
    const j = iso(d);
    if (d.getUTCDay() === 0) continue;   // dimanche : jamais ouvrable
    if (F.has(j)) continue;              // férié tombant un jour ouvrable : non décompté
    n++;
  }
  return n;
}

export const jjmmaaaa = (v: unknown) => {
  const s = texte(v).slice(0, 10);
  return s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "";
};
export const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const dateLongue = (v: unknown) => {
  const s = texte(v).slice(0, 10);
  if (!s) return "";
  return `${Number(s.slice(8, 10))} ${MOIS_FR[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
};

export const jeton = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;

export const estConge = (type: string) => type === "Congés";
export const libelleType = (type: string) => (estConge(type) ? "congés payés" : "absence sans solde");

// ── Rattachement au mois de paie ────────────────────────────────────────────
// Uniquement pour une demande ACCEPTÉE. La ligne mensuelle n'existe pas toujours :
// une demande posée deux mois à l'avance tombe sur un mois qui n'a pas encore été ouvert
// dans la table Congés. Dans ce cas on ne fabrique rien — les compteurs de paie ne
// s'inventent pas — et le cron réessaie à chaque passage jusqu'à ce que le mois existe.
export async function rattacherAuMois(abs: Rec): Promise<{ fait: boolean; detail: string }> {
  const debut = texte(abs.fields["Date de debut"]).slice(0, 7);
  const employe = liens(abs.fields["Employé liée"])[0];
  if (!debut || !employe) return { fait: false, detail: "absence sans date de début ou sans salarié" };
  if (liens(abs.fields["Congé mensuel lié"]).length) return { fait: true, detail: "déjà rattachée" };
  const mois = await lireTable(T_CONGES, `LEFT({Debut mois}, 7) = '${debut}'`);
  const ligne = mois.find((m) => liens(m.fields["Employé liée"]).includes(employe));
  if (!ligne) return { fait: false, detail: `le mois ${debut} n'est pas encore ouvert dans la table Congés : rattachement au prochain passage` };
  await airtable("PATCH", T_ABSENCES, { records: [{ id: abs.id, fields: { "Congé mensuel lié": [ligne.id] } }] });
  return { fait: true, detail: `rattachée au mois ${debut}` };
}

export async function utilisateurDe(abs: Rec): Promise<Rec | null> {
  const id = liens(abs.fields["Employé liée"])[0];
  return id ? lireEnregistrement(T_UTILISATEURS, id) : null;
}

// Solde de congés le plus récent connu pour ce salarié : il éclaire la décision de Vincent.
export async function soldeDe(employeId: string): Promise<{ solde: number | null; mois: string }> {
  if (!employeId) return { solde: null, mois: "" };
  const lignes = (await lireTable(T_CONGES))
    .filter((m) => liens(m.fields["Employé liée"]).includes(employeId) && texte(m.fields["Debut mois"]))
    .sort((a, b) => texte(b.fields["Debut mois"]).localeCompare(texte(a.fields["Debut mois"])));
  if (!lignes.length) return { solde: null, mois: "" };
  const d = lignes[0];
  return { solde: nombre(d.fields["Solde prévisionnel fin du mois"] ?? d.fields["Solde actuel"]), mois: texte(d.fields["Debut mois"]).slice(0, 7) };
}

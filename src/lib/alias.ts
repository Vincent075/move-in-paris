// Comment nommer les gens de l'équipe dans les alertes et les notifications.
//
// Règle posée par Vincent le 29/08/2026 : dans un message interne, on écrit le
// PRÉNOM et rien d'autre. Un nom d'état civil complet fait administratif là où on
// veut lire d'un coup d'œil qui est passé, et ne dit rien de plus à des gens qui
// travaillent ensemble tous les jours.
//
// Les alias sont volontairement écrits en dur ici, et pas rangés dans un champ
// Airtable : ce sont des noms d'usage, ils ne bougent pas, et une valeur en base
// serait un réglage de plus à maintenir pour une poignée de personnes.
//
// Pour ajouter quelqu'un : une ligne dans ALIAS, en minuscules, avec toutes les
// formes sous lesquelles son nom peut arriver (nom complet, ordre inversé, email).

const ALIAS: Record<string, string> = {
  "crispina kawamura": "Edwin",
  "kawamura crispina": "Edwin",
  "crispina": "Edwin",
};

// Enlève les accents et réduit les espaces, pour que « Stéphane » et « Stephane »
// tombent sur la même clé.
const normalise = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Nom à afficher dans un message : l'alias s'il existe, sinon le prénom seul.
 * Accepte un nom complet, un email, ou une chaîne vide.
 */
export function nomAffiche(brut: string): string {
  const s = (brut || "").trim();
  if (!s) return "";

  const cle = normalise(s);
  if (ALIAS[cle]) return ALIAS[cle];

  // Une adresse mail : on ne garde que ce qui précède l'arobase, et on coupe au
  // premier séparateur (prenom.nom@… → prenom).
  if (s.includes("@")) {
    const local = s.split("@")[0].split(/[._-]/)[0];
    const aliasMail = ALIAS[normalise(local)];
    if (aliasMail) return aliasMail;
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
  }

  const prenom = s.split(/\s+/)[0];
  return ALIAS[normalise(prenom)] || prenom;
}

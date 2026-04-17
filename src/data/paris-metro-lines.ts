/**
 * Station → metro lines mapping for Paris (Métro lines 1–14 including 3bis and 7bis).
 *
 * Used as a fallback when OpenStreetMap doesn't expose line info on the station
 * node itself (which is the case for most Paris stations — line info lives on
 * route relations in OSM).
 *
 * Source: official RATP network topology as of 2026.
 */

const METRO_LINES: Record<string, string[]> = {
  "1": [
    "La Défense", "Esplanade de La Défense", "Pont de Neuilly", "Les Sablons",
    "Porte Maillot", "Argentine", "Charles de Gaulle – Étoile", "George V",
    "Franklin D. Roosevelt", "Champs-Élysées – Clemenceau", "Concorde", "Tuileries",
    "Palais Royal – Musée du Louvre", "Louvre – Rivoli", "Châtelet", "Hôtel de Ville",
    "Saint-Paul", "Bastille", "Gare de Lyon", "Reuilly – Diderot", "Nation",
    "Porte de Vincennes", "Saint-Mandé", "Bérault", "Château de Vincennes",
  ],
  "2": [
    "Porte Dauphine", "Victor Hugo", "Charles de Gaulle – Étoile", "Ternes",
    "Courcelles", "Monceau", "Villiers", "Rome", "Place de Clichy", "Blanche",
    "Pigalle", "Anvers", "Barbès – Rochechouart", "La Chapelle", "Stalingrad",
    "Jaurès", "Colonel Fabien", "Belleville", "Couronnes", "Ménilmontant",
    "Père Lachaise", "Philippe Auguste", "Alexandre Dumas", "Avron", "Nation",
  ],
  "3": [
    "Pont de Levallois – Bécon", "Anatole France", "Louise Michel",
    "Porte de Champerret", "Pereire", "Wagram", "Malesherbes", "Villiers",
    "Europe", "Saint-Lazare", "Havre – Caumartin", "Opéra", "Quatre-Septembre",
    "Bourse", "Sentier", "Réaumur – Sébastopol", "Arts et Métiers", "Temple",
    "République", "Parmentier", "Rue Saint-Maur", "Père Lachaise", "Gambetta",
    "Porte de Bagnolet", "Gallieni",
  ],
  "3bis": ["Gambetta", "Pelleport", "Saint-Fargeau", "Porte des Lilas"],
  "4": [
    "Porte de Clignancourt", "Simplon", "Marcadet – Poissonniers",
    "Château Rouge", "Barbès – Rochechouart", "Gare du Nord", "Gare de l'Est",
    "Château d'Eau", "Strasbourg – Saint-Denis", "Réaumur – Sébastopol",
    "Étienne Marcel", "Les Halles", "Châtelet", "Cité", "Saint-Michel",
    "Odéon", "Saint-Germain-des-Prés", "Saint-Sulpice", "Saint-Placide",
    "Montparnasse – Bienvenüe", "Vavin", "Raspail", "Denfert-Rochereau",
    "Mouton-Duvernet", "Alésia", "Porte d'Orléans", "Mairie de Montrouge",
    "Verdun Sud", "Barbara", "Bagneux – Lucie Aubrac",
  ],
  "5": [
    "Bobigny – Pablo Picasso", "Bobigny – Pantin – Raymond Queneau",
    "Église de Pantin", "Hoche", "Porte de Pantin", "Ourcq", "Laumière",
    "Jaurès", "Stalingrad", "Gare du Nord", "Gare de l'Est",
    "Jacques Bonsergent", "République", "Oberkampf", "Richard-Lenoir",
    "Bréguet – Sabin", "Bastille", "Quai de la Rapée", "Gare d'Austerlitz",
    "Saint-Marcel", "Campo-Formio", "Place d'Italie",
  ],
  "6": [
    "Charles de Gaulle – Étoile", "Kléber", "Boissière", "Trocadéro", "Passy",
    "Bir-Hakeim", "Dupleix", "La Motte-Picquet – Grenelle", "Cambronne",
    "Sèvres – Lecourbe", "Pasteur", "Montparnasse – Bienvenüe", "Edgar Quinet",
    "Raspail", "Denfert-Rochereau", "Saint-Jacques", "Glacière", "Corvisart",
    "Place d'Italie", "Nationale", "Chevaleret", "Quai de la Gare", "Bercy",
    "Dugommier", "Daumesnil", "Bel-Air", "Picpus", "Nation",
  ],
  "7": [
    "La Courneuve – 8 Mai 1945", "Fort d'Aubervilliers",
    "Aubervilliers – Pantin – Quatre Chemins", "Porte de la Villette",
    "Corentin Cariou", "Crimée", "Riquet", "Stalingrad", "Louis Blanc",
    "Château-Landon", "Gare de l'Est", "Poissonnière", "Cadet", "Le Peletier",
    "Chaussée d'Antin – La Fayette", "Opéra", "Pyramides",
    "Palais Royal – Musée du Louvre", "Pont Neuf", "Châtelet", "Pont Marie",
    "Sully – Morland", "Jussieu", "Place Monge", "Censier – Daubenton",
    "Les Gobelins", "Place d'Italie", "Tolbiac", "Maison Blanche",
    "Le Kremlin-Bicêtre", "Villejuif – Léo Lagrange",
    "Villejuif – Paul Vaillant-Couturier", "Villejuif – Louis Aragon",
    "Porte d'Ivry", "Pierre et Marie Curie", "Mairie d'Ivry",
  ],
  "7bis": [
    "Louis Blanc", "Jaurès", "Bolivar", "Buttes Chaumont", "Botzaris",
    "Place des Fêtes", "Pré Saint-Gervais", "Danube",
  ],
  "8": [
    "Balard", "Lourmel", "Boucicaut", "Félix Faure", "Commerce",
    "La Motte-Picquet – Grenelle", "École Militaire", "La Tour-Maubourg",
    "Invalides", "Concorde", "Madeleine", "Opéra", "Richelieu – Drouot",
    "Grands Boulevards", "Bonne Nouvelle", "Strasbourg – Saint-Denis",
    "République", "Filles du Calvaire", "Saint-Sébastien – Froissart",
    "Chemin Vert", "Bastille", "Ledru-Rollin", "Faidherbe – Chaligny",
    "Reuilly – Diderot", "Montgallet", "Daumesnil", "Michel Bizot",
    "Porte Dorée", "Porte de Charenton", "Liberté", "Charenton – Écoles",
    "École Vétérinaire de Maisons-Alfort", "Maisons-Alfort – Stade",
    "Maisons-Alfort – Les Juilliottes", "Créteil – L'Échat",
    "Créteil – Université", "Créteil – Préfecture", "Pointe du Lac",
  ],
  "9": [
    "Pont de Sèvres", "Billancourt", "Marcel Sembat", "Porte de Saint-Cloud",
    "Exelmans", "Michel-Ange – Molitor", "Michel-Ange – Auteuil", "Jasmin",
    "Ranelagh", "La Muette", "Rue de la Pompe", "Trocadéro", "Iéna",
    "Alma – Marceau", "Franklin D. Roosevelt", "Saint-Philippe du Roule",
    "Miromesnil", "Saint-Augustin", "Havre – Caumartin",
    "Chaussée d'Antin – La Fayette", "Richelieu – Drouot", "Grands Boulevards",
    "Bonne Nouvelle", "Strasbourg – Saint-Denis", "République", "Oberkampf",
    "Saint-Ambroise", "Voltaire", "Charonne", "Rue des Boulets", "Nation",
    "Buzenval", "Maraîchers", "Porte de Montreuil", "Robespierre",
    "Croix de Chavaux", "Mairie de Montreuil",
  ],
  "10": [
    "Boulogne – Pont de Saint-Cloud", "Boulogne – Jean Jaurès",
    "Porte d'Auteuil", "Michel-Ange – Molitor", "Michel-Ange – Auteuil",
    "Chardon-Lagache", "Mirabeau", "Javel – André Citroën", "Charles Michels",
    "Avenue Émile Zola", "La Motte-Picquet – Grenelle", "Ségur", "Duroc",
    "Vaneau", "Sèvres – Babylone", "Mabillon", "Odéon", "Cluny – La Sorbonne",
    "Maubert – Mutualité", "Cardinal Lemoine", "Jussieu", "Gare d'Austerlitz",
  ],
  "11": [
    "Châtelet", "Hôtel de Ville", "Rambuteau", "Arts et Métiers", "République",
    "Goncourt", "Belleville", "Pyrénées", "Jourdain", "Place des Fêtes",
    "Télégraphe", "Porte des Lilas", "Mairie des Lilas", "Serge Gainsbourg",
    "Liberté", "Romainville – Carnot", "Place Carnot – Centre-Ville",
    "Hôpital de Montreuil", "La Dhuys", "Coteaux Beauclair",
    "Rosny Bois-Perrier",
  ],
  "12": [
    "Mairie d'Aubervilliers", "Aubervilliers – Front Populaire",
    "Porte de la Chapelle", "Marx Dormoy", "Marcadet – Poissonniers",
    "Jules Joffrin", "Lamarck – Caulaincourt", "Abbesses", "Pigalle",
    "Saint-Georges", "Notre-Dame-de-Lorette",
    "Trinité – d'Estienne d'Orves", "Saint-Lazare", "Madeleine", "Concorde",
    "Assemblée Nationale", "Solférino", "Rue du Bac", "Sèvres – Babylone",
    "Rennes", "Notre-Dame-des-Champs", "Montparnasse – Bienvenüe",
    "Falguière", "Pasteur", "Volontaires", "Vaugirard", "Convention",
    "Porte de Versailles", "Corentin Celton", "Mairie d'Issy",
  ],
  "13": [
    "Châtillon – Montrouge", "Malakoff – Rue Étienne Dolet",
    "Malakoff – Plateau de Vanves", "Porte de Vanves", "Plaisance", "Pernety",
    "Gaîté", "Montparnasse – Bienvenüe", "Duroc", "Saint-François-Xavier",
    "Varenne", "Invalides", "Champs-Élysées – Clemenceau", "Miromesnil",
    "Saint-Lazare", "Liège", "Place de Clichy", "La Fourche",
    // Branch to Asnières – Gennevilliers
    "Brochant", "Porte de Clichy", "Mairie de Clichy", "Gabriel Péri",
    "Les Agnettes", "Les Courtilles",
    // Branch to Saint-Denis – Université
    "Guy Môquet", "Porte de Saint-Ouen", "Garibaldi", "Mairie de Saint-Ouen",
    "Carrefour Pleyel", "Saint-Denis – Porte de Paris",
    "Basilique de Saint-Denis", "Saint-Denis – Université",
  ],
  "14": [
    "Saint-Denis – Pleyel", "Mairie de Saint-Ouen", "Saint-Ouen",
    "Porte de Clichy", "Pont Cardinel", "Saint-Lazare", "Madeleine",
    "Pyramides", "Châtelet", "Gare de Lyon", "Bercy", "Cour Saint-Émilion",
    "Bibliothèque François Mitterrand", "Olympiades", "Maison Blanche",
    "Hôpital Bicêtre", "Villejuif – Gustave Roussy",
    "Chevilly – Trois Communes", "Thiais – Orly", "Aéroport d'Orly",
  ],
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\(.*?\)/g, "") // drop parenthetical
    .replace(/[—–\-'']/g, " ") // normalize dashes + apostrophes
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

const STATION_TO_LINES: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const [line, stations] of Object.entries(METRO_LINES)) {
    for (const station of stations) {
      const key = normalize(station);
      if (!m.has(key)) m.set(key, new Set());
      m.get(key)!.add(line);
    }
  }
  return m;
})();

/**
 * Look up a Paris Metro station by name and return the list of lines serving it.
 * Handles accent, punctuation and case differences. Returns [] if unknown.
 */
export function getMetroLines(stationName: string): string[] {
  const key = normalize(stationName);
  const set = STATION_TO_LINES.get(key);
  if (!set) return [];
  return Array.from(set).sort();
}

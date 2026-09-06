// Suite de non-régression du moteur de rapprochement et de relance (recouvrement).
// Règle de Vincent (06/09/2026) : ne JAMAIS passer une facture impayée en payée, n'imputer
// que ce qui est prouvé. Chaque scénario exécute la vraie fonction sur des cas construits.
//   npx tsx scripts/tests/recouvrement.test.ts
// Le script sort en erreur (code 1) au premier KO : à lancer avant tout déploiement du moteur.
import { rapprocher, diagnostic, reconnaitrePayeur, horsClient, citeNumero, refsRegistre, commission, lireMontant, estLoreal, mots, nomDe, rapprocherHistorique,
  type FactureOuverte, type Credit, type Annuaire, type CreanceHistorique, type Nom } from "../../src/lib/mip/recouvrement";
const fac = (numero: string, client: string, montant: number, dateEnvoi: string, o: Partial<FactureOuverte> & { occupant?: string; agenceNom?: string } = {}): FactureOuverte => {
  const noms = [nomDe(client, true, "client"), nomDe(o.agenceNom || "", true, "agence"), nomDe(o.occupant || "", false, "occupant")].filter((n): n is Nom => !!n);
  const reste = o.reste ?? montant;
  return { rec: { id: numero, fields: {} } as never, numero, numeroPl: o.numeroPl ?? "", montant, montantHT: montant, encaisse: montant - reste - (o.credite ?? 0), credite: o.credite ?? 0, reste,
    client, agence: o.agenceNom || "", occupants: o.occupant || "", mention: o.mention ?? "", mots: new Set(noms.flatMap((n) => n.mots)), noms, loreal: estLoreal(client) || estLoreal(o.agenceNom || ""), dateEnvoi };
};
const cr = (libelle: string, montant: number, date = "2026-09-10"): Credit => ({ id: "t", date, montant, libelle, compte: "1848853" });
let ok = 0, ko = 0;
const test = (titre: string, got: unknown, want: unknown, extra = "") => { const b = JSON.stringify(got) === JSON.stringify(want); b ? ok++ : ko++; console.log(`${b ? "OK " : "KO "} ${titre}${b ? "" : `\n     obtenu ${JSON.stringify(got)} | attendu ${JSON.stringify(want)}`}${extra ? `\n     ${extra}` : ""}`); };
const num = (r: ReturnType<typeof rapprocher>) => (r ? r.factures.map((f) => f.numero).join("+") : null);
const numH = (r: ReturnType<typeof rapprocherHistorique>) => (r ? r.creances.map((x) => x.ref).join("+") : null);

console.log("── Ambiguïtés ──");
const deux = [fac("FAC-2026-0501", "Dupont SAS", 5250, "2026-08-01"), fac("FAC-2026-0502", "Dupont SAS", 5250, "2026-08-02")];
let c = cr("VIR SEPA RECU /FRM DUPONT SAS /MOTIF LOYER", 5250);
test("2 factures identiques, virement pour une seule → rien", num(rapprocher(c, deux)), null, diagnostic(c, deux));
test("les deux réglées → les deux", num(rapprocher(cr("VIR DUPONT SAS", 10500), deux)), "FAC-2026-0501+FAC-2026-0502");
const trio = [fac("FAC-2026-0601", "Martin Corp", 5000, "2026-08-01"), fac("FAC-2026-0602", "Martin Corp", 3000, "2026-08-02"), fac("FAC-2026-0603", "Martin Corp", 2000, "2026-08-03")];
c = cr("VIR MARTIN CORP", 5000);
test("5000 = A ou B+C → rien", num(rapprocher(c, trio)), null, diagnostic(c, trio));
test("3000 = B seule → B", num(rapprocher(cr("VIR MARTIN CORP", 3000), trio)), "FAC-2026-0602");
console.log("── Numéro cité ──");
test("numéro cité, montant exact → la bonne", num(rapprocher(cr("VIR DUPONT /RNF FAC-2026-0502", 5250), deux)), "FAC-2026-0502");
test("numéro cité sans facture ouverte → rien (pas de devinette au nom)", num(rapprocher(cr("VIR DUPONT SAS /RNF FAC-2026-0999", 5250), deux)), null, diagnostic(cr("VIR DUPONT SAS /RNF FAC-2026-0999", 5250), deux));
test("numéro cité, facture émise 20 j APRÈS le virement (règlement anticipé) → rapprochée", num(rapprocher(cr("VIR X /RNF FAC-2026-0700", 900, "2026-08-01"), [fac("FAC-2026-0700", "Zeta", 900, "2026-08-21")])), "FAC-2026-0700");
const citees = [fac("FAC-2026-0801", "Alpha", 1972, "2026-08-01"), fac("FAC-2026-0802", "Alpha", 2204, "2026-08-02")];
test("2 numéros cités, montant = l'une des deux → celle-là", num(rapprocher(cr("VIR ALPHA FAC-2026-0801 FAC-2026-0802", 2204), citees)), "FAC-2026-0802");
test("2 numéros cités, montant sans combinaison → rien (plus d'imputation dans l'ordre)", num(rapprocher(cr("VIR ALPHA FAC-2026-0801 FAC-2026-0802", 3000), citees)), null);
test("numéro cité, +0,80 € (arrondi) → soldée", rapprocher(cr("VIR FAC-2026-0801", 1972.8), citees)?.methode, "numéro cité, écart d'arrondi");
test("numéro cité, +40 € → rien (trop-perçu jamais absorbé)", num(rapprocher(cr("VIR FAC-2026-0801", 2012), citees)), null, diagnostic(cr("VIR FAC-2026-0801", 2012), citees));
console.log("── Désignation du dossier ──");
const homonymes = [fac("FAC-2026-1238", "Loro Piana", 2459.1, "2026-08-20", { occupant: "Dawen Ntertsou" }), fac("FAC-2026-1300", "Cosmopolitan", 2459.1, "2026-08-20", { occupant: "Anna Ntertsou" })];
test("un seul mot commun (nom d'occupant partagé) ne désigne pas → rien", num(rapprocher(cr("VIR NTERTSOU", 2459.1), homonymes)), null, diagnostic(cr("VIR NTERTSOU", 2459.1), homonymes));
test("nom complet de l'occupant → la bonne", num(rapprocher(cr("VIR DAWEN NTERTSOU LOYER", 2459.1), homonymes)), "FAC-2026-1238");
test("occupant écrit NOM PRÉNOM (ordre libre pour une personne) → la bonne", num(rapprocher(cr("VIR M NTERTSOU DAWEN", 2459.1), homonymes)), "FAC-2026-1238");
test("société dans le désordre (KABI FRESENIUS) ne désigne pas", num(rapprocher(cr("KABI PHARMA FRESENIUS DEUTSCHLAND", 2175), [fac("FAC-2026-0125", "Fresenius Kabi France", 2175, "2026-08-01")])), null);
test("règlement partiel sur facture directe (sans agence) → partiel", rapprocher(cr("VIR PERNOD RICARD", 2000), [fac("FAC-2026-0126", "Pernod Ricard", 3045, "2026-08-01")])?.partiel, true);
test("numéro cité, partiel sur facture d'AGENCE → rien (commission probable)", num(rapprocher(cr("SILVERDOOR /RNF FAC-2026-2000", 3600), [fac("FAC-2026-2000", "SilverDoor", 4000, "2026-08-01", { agenceNom: "SilverDoor" })])), null);
test("prénom seul d'un inconnu ne réduit pas une facture (acompte ERIC DUPONT)", num(rapprocher(cr("VIR ERIC DUPONT ACOMPTE", 800), [fac("FAC-2026-1253", "L'Oréal SA", 2196, "2026-08-01", { occupant: "Eric Gilbert Lapoirie" })])), null);
test("dossier partenaire (mention) désigne la facture", num(rapprocher(cr("STELLAR CORPORATE HOUSING ID1737 INV2026311", 2420), [fac("FAC-2026-0900", "Apple", 2420, "2026-08-01", { mention: "INV2026311", agenceNom: "Stellar Corporate Housing" })])), "FAC-2026-0900");
test("AXA (un mot) émetteur du virement, montant exact → rapproché", num(rapprocher(cr("VIR SEPA RECU /FRM AXA /EID 1 /RNF 10725195", 2639), [fac("FAC-2026-0160", "AXA GROUP - GIE AXA", 2639, "2026-08-01", { occupant: "Paredes" })])), "FAC-2026-0160");
test("L'Oréal jamais rapproché automatiquement", num(rapprocher(cr("L OREAL SA-ETABLISSEMENT CORPOR 0010092102 MOVE IN PARIS 2026A649", 3950), [fac("FAC-2026-1255", "L'Oréal SA", 3950, "2026-08-01")])), null);
console.log("── Partenaires et commissions ──");
const sd = [fac("FAC-2026-2000", "SilverDoor", 4000, "2026-08-01", { agenceNom: "SilverDoor" })];
test("SilverDoor 3 600 € sans référence ni commission écrite → rien (plus de taux deviné)", num(rapprocher(cr("VIR SILVERDOOR LTD", 3600), sd)), null, diagnostic(cr("VIR SILVERDOOR LTD", 3600), sd));
test("SilverDoor commission écrite + numéro cité → soldée", rapprocher(cr("SILVER DOOR PAYOUT LESS COMM 400.00 /RNF FAC-2026-2000", 3600), sd)?.methode, "numéro cité, commission écrite déduite");
test("Oasis commission écrite, 2 factures au même brut → rien", num(rapprocher(cr("OASIS CORPORATE HOUSING LESS COMM 100,00 ACCENTURE FRANCE", 900), [fac("FAC-2026-0901", "Accenture France", 1000, "2026-08-01", { agenceNom: "Oasis Corporate Housing" }), fac("FAC-2026-0902", "Accenture France", 1000, "2026-08-02", { agenceNom: "Oasis Corporate Housing" })])), null);
test("commission « LESS COMM 1250 » = 1 250 € (plus 12,50)", commission("PAYOUT LESS COMM 1250 - INV"), 1250);
test("commission « LESS COMMISSION 1.250,00 » = 1 250 €", commission("PAYOUT LESS COMMISSION 1.250,00 EUR"), 1250);
test("commission « LESS COMM 1,250.00 » = 1 250 €", commission("LESS COMM 1,250.00"), 1250);
test("commission « LESS COMM. 250,00 EUR » = 250 €", commission("SILVERDOOR PAYOUT LESS COMM. 250,00 EUR"), 250);
test("commission « 100.00 12.06.26 » ne mange pas la date", commission("OASIS LESS COMM 100.00 12.06.26 - X"), 100);
test("« WIRELESS 300.00 » n'est pas une commission", commission("WIRELESS 300.00 REFUND"), null);
test("lireMontant 1 250,00 / 1250 / 12,5", [lireMontant("1 250,00"), lireMontant("1250"), lireMontant("12,5")], [1250, 1250, 12.5]);
console.log("── Avoirs partiels et TTC ──");
const avecAvoir = [fac("FAC-2026-0126", "Pernod Ricard", 3045, "2026-08-01", { credite: 195, reste: 2850 })];
test("avoir partiel de 195 : le client règle le net 2 850 → soldée", rapprocher(cr("VIR PERNOD RICARD /RNF FAC-2026-0126", 2850), avecAvoir)?.partiel, false);
console.log("── Hors client ──");
test("HUBER n'est pas UBER", horsClient(cr("VIR SEPA INST RECU /FRM MARKUS HUBER /RNF FAC-2026-1256", 100)), false);
test("CAPITALE n'est pas CAPITAL", horsClient(cr("1/PARIS CAPITALE RELOCATION", 100)), false);
test("APPORT EN CAPITAL est hors client", horsClient(cr("APPORT EN CAPITAL ASSOCIE", 100)), true);
test("UBER remboursement est hors client", horsClient(cr("REMBOURST CB DU 030726 UBER * E", 11.97)), true);
test("GOOGLE FRANCE SARL /RNF FAC-… : numéro cité l'emporte (citeNumero)", [horsClient(cr("GOOGLE FRANCE SARL /RNF FAC-2026-0125", 100)), citeNumero("GOOGLE FRANCE SARL /RNF FAC-2026-0125")], [true, true]);
console.log("── Payeur formel ──");
const annuaire: Annuaire = { clients: [{ id: "c1", fields: { "Nom client final": "Fresenius Kabi France" } }, { id: "c2", fields: { "Nom client final": "Pernod Ricard" } }, { id: "c3", fields: { "Nom client final": "Dior Couture" } }] as never,
  agences: [{ id: "a1", fields: { "Nom agence": "Relocation Service" } }, { id: "a2", fields: { "Nom agence": "Santa Fé Relocation" } }, { id: "a3", fields: { "Nom agence": "Cosmopolitan Services Unlimited" } }, { id: "a4", fields: { "Nom agence": "Apartment In" } }] as never,
  occupants: [{ id: "o1", fields: { Nom: "DEAL", "Prénom": "Christine", "Nom complet": "Christine DEAL" } }] as never };
test("Fresenius complet → sûr", reconnaitrePayeur(cr("VIR FRESENIUS KABI FRANCE /RNF 123", 100), annuaire)?.sur, true);
test("PERNOD seul → pas sûr, pas d'email", reconnaitrePayeur(cr("VIR PERNOD SA", 100), annuaire)?.sur ?? "aucun", "aucun");
test("client en /FRM citant son agence en référence → le client, pas l'agence", (() => { const p = reconnaitrePayeur(cr("VIR SEPA RECU /FRM PERNOD RICARD /EID 1 /RNF SANTA FE RELOCATION DOSSIER KYTTA", 500), annuaire); return [p?.type, p?.nom, p?.sur]; })(), ["Client final", "Pernod Ricard", true]);
test("KABI PHARMA FRESENIUS DEUTSCHLAND → probable, pas sûr", reconnaitrePayeur(cr("KABI PHARMA FRESENIUS DEUTSCHLAND", 100), annuaire)?.sur, false);
test("SANTA FE RELOCATION SERVICE (deux agences à égalité) → pas sûr", reconnaitrePayeur(cr("VIR SANTA FE RELOCATION SERVICE", 100), annuaire)?.sur, false);
test("agence + client tous deux présents → l'agence, sûre", (() => { const p = reconnaitrePayeur(cr("1/COSMOPOLITAN SERVICES UNLIMITED /URI/DIOR COUTURE BOUGUERRA", 3000), annuaire); return [p?.type, p?.sur]; })(), ["Agence", true]);
console.log("── Registre et créances historiques ──");
test("refsRegistre lit 2026-275 et 2026-367, pas F-2026-08-0312", refsRegistre("VIR BNP /RNF 2026-275 2026-367 F-2026-08-0312"), ["2026-275", "2026-367"]);
const hist: CreanceHistorique[] = [
  { rel: { id: "r1", fields: {} } as never, ref: "2026-275", client: "BNP PARIBAS", occupant: "LE GOAREGUER", montant: 5250, encaisse: 0, reste: 5250, noms: [nomDe("BNP PARIBAS", true, "client")!, nomDe("LE GOAREGUER", false, "occupant")!], factureHistId: "h1", loreal: false },
  { rel: { id: "r2", fields: {} } as never, ref: "2026-367", client: "BNP PARIBAS", occupant: "LE GOAREGUER", montant: 4725, encaisse: 0, reste: 4725, noms: [nomDe("BNP PARIBAS", true, "client")!, nomDe("LE GOAREGUER", false, "occupant")!], factureHistId: "h2", loreal: false },
  { rel: { id: "r3", fields: {} } as never, ref: "2025-117", client: "CHANEL", occupant: "LEBEDEV", montant: 1799.24, encaisse: 0, reste: 1799.24, noms: [nomDe("CHANEL", true, "client")!, nomDe("LEBEDEV", false, "occupant")!], factureHistId: "h3", loreal: false },
];
test("BNP règle 9 975 en citant les deux numéros → les deux créances", numH(rapprocherHistorique(cr("VIR BNP PARIBAS PERSONAL FINANCE /RNF 2026-275 2026-367", 9975), hist)), "2026-275+2026-367");
test("BNP règle 5 250 sans numéro : 1 seule créance BNP à ce montant → 2026-275", numH(rapprocherHistorique(cr("VIR BNP PARIBAS PERSONAL FINANCE", 5250), hist)), "2026-275");
test("BNP règle 9 975 sans numéro : somme exacte unique → les deux", numH(rapprocherHistorique(cr("VIR BNP PARIBAS PERSONAL FINANCE", 9975), hist)), "2026-275+2026-367");
test("BNP règle 4 000 sans numéro → rien", numH(rapprocherHistorique(cr("VIR BNP PARIBAS PERSONAL FINANCE", 4000), hist)), null);
test("Chanel cite 2025-117 → la créance", numH(rapprocherHistorique(cr("CHANEL SAS /RNF 2025-117", 1799.24), hist)), "2025-117");
test("numéro de registre cité mais inconnu → rien", numH(rapprocherHistorique(cr("VIR X /RNF 2025-999", 1799.24), hist)), null);
console.log("── L'Oréal ──");
test("estLoreal : L OREAL / L'Oréal / LOREAL oui, BOREALIS FLOREAL non", ["L OREAL SA", "L'Oréal SA", "LOREAL", "BOREALIS", "Floréal SAS"].map(estLoreal), [true, true, true, false, false]);

console.log("── Partiels : désignation forte et agences ──");
test("AXA (un seul mot) : montant exact → rapproché", num(rapprocher(cr("AXA 2026-468 - CONVERA UK LIMITED", 2639), [fac("FAC-2026-0160", "AXA GROUP - GIE AXA", 2639, "2026-08-01", { occupant: "Paredes PAREDES" })])), "FAC-2026-0160");
test("AXA (un seul mot) : montant inférieur → PAS de partiel deviné", num(rapprocher(cr("AXA ASSURANCES VIE REMBOURSEMENT", 1500), [fac("FAC-2026-0160", "AXA GROUP - GIE AXA", 2639, "2026-08-01", { occupant: "Paredes PAREDES" })])), null, diagnostic(cr("AXA ASSURANCES VIE REMBOURSEMENT", 1500), [fac("FAC-2026-0160", "AXA GROUP - GIE AXA", 2639, "2026-08-01", { occupant: "Paredes PAREDES" })]));
const factAgence = fac("FAC-2026-3000", "Dior Couture", 3000, "2026-08-01", { agenceNom: "Cosmopolitan Services Unlimited" }); (factAgence.rec as unknown as { fields: Record<string, unknown> }).fields["Facturer à"] = "Agence";
test("facture adressée à une agence : partiel refusé", num(rapprocher(cr("VIR DIOR COUTURE", 2000), [factAgence])), null);
test("facture adressée à une agence : montant exact accepté", num(rapprocher(cr("VIR DIOR COUTURE", 3000), [factAgence])), "FAC-2026-3000");
test("commission « LESS COMM OF EUR 250.00 » lue", commission("PAYOUT LESS COMM OF EUR 250.00"), 250);


console.log("── Désignation : agence, mention, homonymes ──");
const cosmo = [fac("FAC-2026-0126", "Pernod Ricard", 3045, "2026-08-05", { occupant: "Jan Mikael KYTTA", agenceNom: "Cosmopolitan Services Unlimited" }), fac("FAC-2026-1238", "Loro Piana", 2459.1, "2026-08-20", { occupant: "Maria NTERTSOU", agenceNom: "Cosmopolitan Services Unlimited" })];
test("virement Cosmopolitan pour NTERTSOU au montant de la facture Pernod → rien (l'agence ne désigne pas)", num(rapprocher(cr("1/COSMOPOLITAN SERVICES UNLIMIT NA NTERTSOU LOYER JUILLET 2026///ROC/2026-324", 3045, "2026-08-04"), cosmo)), null);
test("virement Cosmopolitan /URI/PERNOD RICARD au bon montant → Pernod", num(rapprocher(cr("VIREMENT RECU TIERS 1/COSMOPOLITAN SERVICES UNLIMITED /URI/PRENOD RICARD - KYTTA JAN - LOYER", 3045, "2026-08-04"), cosmo)), "FAC-2026-0126");
test("mention générique « Septembre 2026 » ne désigne pas", num(rapprocher(cr("VIR SEPA RECU /FRM ACME INDUSTRIES /EID 1 /RNF LOYER SEPTEMBRE 2026", 2459.1), [fac("FAC-2026-1238", "Loro Piana", 2459.1, "2026-08-20", { mention: "Septembre 2026" })])), null);
test("mention « 7530 » dans un IBAN ne désigne pas", num(rapprocher(cr("VIR /FRM ACME /EID FR7630004753000012345", 2459.1), [fac("FAC-2026-1238", "Loro Piana", 2459.1, "2026-08-20", { mention: "7530" })])), null);
test("mention pour A, montant de B (même partenaire) → rien", num(rapprocher(cr("SILVERDOOR PAYOUT INV2026311", 3255), [fac("FAC-2026-3001", "Apple", 3000, "2026-08-01", { mention: "INV2026311", agenceNom: "SilverDoor" }), fac("FAC-2026-3002", "Apple", 3255, "2026-08-05", { mention: "INV2026400", agenceNom: "SilverDoor" })])), null);
test("« Apartment In » réduit à un mot creux ne désigne rien", num(rapprocher(cr("VIR SEPA INST RECU /FRM JOHN SMITH /EID 1 /RNF APARTMENT RENT SEPTEMBER", 2500), [fac("FAC-2026-5000", "Apple", 2500, "2026-08-01", { occupant: "Lina PATEL", agenceNom: "Apartment In" })])), null);
test("L’Oréal avec apostrophe courbe reste L'Oréal", estLoreal("L’Oréal SA"), true);
console.log("── Commissions : le mot COMM est obligatoire ──");
test("« LESS 400 CLEANING FEE » n'est pas une commission", commission("OASIS PAYOUT LESS 400 CLEANING FEE DISPUTE"), null);
test("« LESS 150 DEPOSIT » n'est pas une commission", commission("PAYMENT 3 NIGHTS LESS 150 DEPOSIT"), null);
test("« LESS 10% COMM » n'est pas un montant", commission("SILVERDOOR PAYOUT LESS 10% COMM REF SD-2000"), null);
test("« LESS COMM 10% 400.00 » n'est pas un montant", commission("PAYOUT LESS COMM 10% 400.00"), null);
test("« LESS 250.00 COMM » lu", commission("PAYOUT LESS 250.00 COMM REF X"), 250);
console.log("── Payeur : occupant et émetteur ──");
test("« DEAL 2026 SEPTEMBER » ne rend pas Christine DEAL sûre", reconnaitrePayeur(cr("VIR SEPA RECU /FRM ACME CONSULTING /EID 1 /RNF DEAL 2026 SEPTEMBER", 500), annuaire)?.sur ?? false, false);
test("« CHRISTINE DEAL » rend l'occupante sûre", reconnaitrePayeur(cr("VIR SEPA RECU /FRM CHRISTINE DEAL /EID 1 /RNF LOYER", 500), annuaire)?.sur, true);
test("« APARTMENT SEPTEMBER » ne rend pas l'agence Apartment In sûre", reconnaitrePayeur(cr("VIR SEPA RECU /FRM JOHN SMITH /EID 1 /RNF APARTMENT SEPTEMBER 2026", 500), annuaire)?.sur ?? "aucun", "aucun");
console.log("── Créances historiques : preuve exigée ──");
const hist2: CreanceHistorique[] = [
  { rel: { id: "r4", fields: {} } as never, ref: "2026-238", client: "BERTAGNA Edouard", occupant: "", montant: 144, encaisse: 0, reste: 144, noms: [nomDe("BERTAGNA Edouard", true, "client")!], factureHistId: "h4", loreal: false },
  { rel: { id: "r5", fields: {} } as never, ref: "2026-346", client: "Stellar Corporate Housing", occupant: "CHEN", montant: 3335, encaisse: 0, reste: 3335, noms: [nomDe("Stellar Corporate Housing", true, "client")!, nomDe("CHEN", false, "occupant")!], factureHistId: "h5", loreal: false },
  { rel: { id: "r6", fields: {} } as never, ref: "2025-707", client: "SilverDoor", occupant: "GERVASONI", montant: 2835, encaisse: 0, reste: 2835, noms: [nomDe("SilverDoor", true, "client")!, nomDe("GERVASONI", false, "occupant")!], factureHistId: "h6", loreal: false },
];
test("inconnu citant « CMD 2026-238 » en partiel → rien", numH(rapprocherHistorique(cr("VIR SEPA RECU /FRM ACME INDUSTRIES /EID 123 /RNF CMD 2026-238", 100), hist2)), null);
test("« CHEN WEI » seul (occupant sans client) → rien", numH(rapprocherHistorique(cr("VIR SEPA RECU /FRM CHEN WEI /RNF LOYER OCTOBRE", 3335), hist2)), null);
test("STELLAR + CHEN → la créance", numH(rapprocherHistorique(cr("STELLAR CORPORATE HOUSING CHEN LOYER", 3335), hist2)), "2026-346");
test("SilverDoor partiel sur 2025-707 cité → rien (commission probable)", numH(rapprocherHistorique(cr("SILVERDOOR LTD PAYOUT /RNF 2025-707 GERVASONI", 2551.5), hist2)), null);
test("SilverDoor montant exact sur 2025-707 cité → réglée", numH(rapprocherHistorique(cr("SILVERDOOR LTD PAYOUT /RNF 2025-707", 2835), hist2)), "2025-707");

console.log(`\n${ok} OK, ${ko} KO`);
if (ko) process.exit(1);

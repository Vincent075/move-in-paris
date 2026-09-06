import { NextResponse } from "next/server";
import { passeRelances, apercuGabarits, monitoring } from "@/lib/mip/recouvrement-passes";
import { avecDestinataireTest } from "@/lib/mip/recouvrement";

// Relances — chaque matin de semaine à 7h30 (Paris) : vercel.json « 30 5 * * 1-5 » (UTC).
//
// Circuit demandé par Vincent (05/09/2026) : une facture dont l'échéance (date d'envoi
// + 30 jours) est dépassée entre dans la table Relances et avance seule :
//   J+0  → 1re relance automatique (courtoise, demande de preuve de paiement si déjà réglé)
//   J+7  → 2e relance automatique (ferme, règlement sous 7 jours)
//   J+14 → « relance manuelle » : email HTML à Guillaume avec la liste, il coche « Relance 3 faite »
// Un règlement détecté (banque, Pennylane ou statut « Payée ») clôture la relance et envoie
// la confirmation de bonne réception. Avant toute relance : banque du jour relue, facture
// revérifiée chez Pennylane, facture jamais envoyée par email ignorée, L'Oréal exclu.
// Toutes les réponses des clients arrivent chez Guillaume (Reply-To).
// `?dry=1` : rien n'est écrit ni envoyé.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  // Le destinataire de test vit dans le contexte de CETTE requête (jamais une variable partagée
  // entre requêtes) : un aperçu ne peut plus partir chez un vrai client.
  const test = dry ? url.searchParams.get("test") || "" : "";
  try {
    // `?dry=1&test=adresse&apercu=1` : un exemplaire de chaque gabarit vers l'adresse de test, rien d'autre.
    if (dry && url.searchParams.get("apercu") === "1" && test) {
      return NextResponse.json({ ok: true, dry, apercu: await avecDestinataireTest(test, () => apercuGabarits()) });
    }
    const r = await avecDestinataireTest(test, () => passeRelances({ dry }));
    if (!dry) {
      await monitoring("Recouvrement · relances", r.erreurs.length || r.annuleesPennylane ? "ALERTE" : "OK",
        `${r.examinees} facture(s) envoyée(s) examinée(s) : ${r.nonEchues} pas encore échue(s), ${r.nouvelles} entrée(s) en relance, ${r.relance1} 1re relance, ${r.relance2} 2e relance, ` +
        `${r.passeesJ14} passée(s) en manuel${r.digest ? " (digest envoyé à Guillaume)" : ""}, ${r.regleesPennylane} réglée(s) selon Pennylane, ${r.regleesAirtable} réglée(s) selon Airtable, ${r.annuleesPennylane} annulée(s) chez Pennylane mais « Envoyée » ici, ` +
        `${r.exclues} exclue(s) (L'Oréal, annulées, « Sans relance »), ${r.sansDateEnvoi} sans date d'envoi, ${r.sansEmailEnvoye} jamais envoyée(s) par email, ${r.sansDestinataire} sans destinataire, ${r.enAttenteManuelle} en attente de relance manuelle.` +
        `${r.erreurs.length ? ` Erreurs : ${r.erreurs.join(" · ")}` : ""}`);
    }
    return NextResponse.json({ ok: r.erreurs.length === 0, dry, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!dry) await monitoring("Recouvrement · relances", "ALERTE", `Passe en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}

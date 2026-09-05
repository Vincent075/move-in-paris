import { NextResponse } from "next/server";
import { passeEncaissements, monitoring } from "@/lib/mip/recouvrement-passes";
import { definirDestinataireTest } from "@/lib/mip/recouvrement";

// Encaissements — toutes les heures (vercel.json, :25).
//
// Lit les crédits bancaires des dix derniers jours dans Pennylane (jeton lecture seule
// PENNYLANE_API_KEY_BANK, variable dédiée), les rapproche des factures « Envoyée » de la
// plateforme et écrit le résultat dans Airtable : « Montant encaissé », « Payée » quand la
// facture est soldée, une ligne Encaissements par crédit, la clôture de la relance ouverte
// et l'email de bonne réception au payeur. Un crédit sans facture reconnue → « À
// identifier » + demande de références au payeur quand on le connaît (jamais L'Oréal).
// Idempotent : un crédit déjà rangé (même identifiant Pennylane) n'est jamais retraité.
// `?dry=1` : tout est calculé, rien n'est écrit ni envoyé (contrôle avant mise en service).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  // `?test=adresse` : tous les emails partent vers cette adresse (uniquement avec dry=1 : rien n'est écrit).
  definirDestinataireTest(dry ? url.searchParams.get("test") || "" : "");
  const depuisJours = Math.min(60, Math.max(1, Number(url.searchParams.get("jours") || 10)));
  try {
    const r = await passeEncaissements({ depuisJours, dry });
    if (!dry) {
      await monitoring("Recouvrement · encaissements", r.erreurs.length ? "ALERTE" : "OK",
        `${r.lus} crédit(s) lu(s), ${r.nouveaux} nouveau(x) : ${r.rapproches} rapproché(s), ${r.partiels} partiel(s), ${r.demandes} demande(s) de références, ` +
        `${r.aIdentifier} à identifier, ${r.horsClient} hors client, ${r.confirmations} confirmation(s).${r.erreurs.length ? ` Erreurs : ${r.erreurs.join(" · ")}` : ""}`);
    }
    return NextResponse.json({ ok: r.erreurs.length === 0, dry, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!dry) await monitoring("Recouvrement · encaissements", "ALERTE", `Passe en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}

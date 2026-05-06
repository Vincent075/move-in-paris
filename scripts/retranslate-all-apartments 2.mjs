#!/usr/bin/env node
/**
 * One-off script: retranslate all apartments to EN using Claude Haiku 4.5.
 * Uses the exact same SYSTEM_PROMPT as the production /lib/translate.ts.
 *
 * Run from project root:
 *   node scripts/retranslate-all-apartments.mjs
 *   node scripts/retranslate-all-apartments.mjs --slug=rue-marbeuf-paris-8e
 *   node scripts/retranslate-all-apartments.mjs --force   # also rewrites already-translated apartments
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const APARTMENTS_PATH = resolve(process.cwd(), "src/data/apartments.json");

// Try to load ANTHROPIC_API_KEY from .env.local (or .env) if not in process.env.
// This avoids the user needing to use export/setenv.
function loadEnvFile() {
  if (process.env.ANTHROPIC_API_KEY) return;
  for (const fname of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), fname);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      let value = m[2];
      // strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
    console.log(`Loaded env from ${fname}`);
    return;
  }
}
loadEnvFile();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n❌ ANTHROPIC_API_KEY not found.");
  console.error("\nFix in 30 seconds:");
  console.error("  1. Create a file named .env.local at the project root");
  console.error("  2. Inside that file, write: ANTHROPIC_API_KEY=sk-ant-...");
  console.error("  3. Save and rerun: node scripts/retranslate-all-apartments.mjs --force\n");
  process.exit(1);
}

const SYSTEM_PROMPT =
  "You translate French real estate listings for a luxury corporate rental agency in Paris into polished English for an international executive audience.\n\n" +
  "Rules:\n" +
  "- Professional, elegant tone (premium service rental).\n" +
  "- Translate EVERY French word. Never leave any French in the output. If you see French words mid-sentence (étage, salon, salle de bain, coin repas, table à manger, rangement, accès, eau chaude, chauffage, tous commerces, commodités, accès privé, etc.), translate them. The goal is 100% English with no untranslated French.\n" +
  "- Units: 'm²' → 'sqm'.\n" +
  "- Floors: 'rez-de-chaussée' → 'ground floor', '1er étage' → '1st floor', '2e/2ème étage' → '2nd floor', '3e/3ème étage' → '3rd floor', '4e' → '4th floor', etc.\n" +
  "- Keep proper nouns untouched: street names, Paris districts (Batignolles, Chaillot, Passy, Auteuil, Marais, Ternes, Étoile, Madeleine, Trocadéro, Saint-Germain, Champs-Élysées, Faubourg-Saint-Honoré, etc.). 'Paris 17e' → 'Paris 17th arrondissement'.\n" +
  "- BEDROOM COUNT IS CRITICAL. In French, 'X pièces' counts the living room as 1 piece (so '2 pièces' often = 1 bedroom + 1 living room). BUT some apartments have a double living room, so the formula bedrooms = pièces - 1 is NOT always correct. The input includes a 'bedrooms' field that is the canonical, admin-validated number of bedrooms. ALWAYS use the bedrooms field as source of truth for the English title and description. Examples:\n" +
  "    French '2 pièces' with bedrooms=1 → English '1-bedroom apartment'.\n" +
  "    French '4 pièces' with bedrooms=2 → English '2-bedroom apartment' (apartment has a double living room).\n" +
  "    French '4 pièces' with bedrooms=3 → English '3-bedroom apartment'.\n" +
  "    bedrooms=0 → 'studio'.\n" +
  "- For the title, format '{N}-Bedroom Apartment {Neighborhood}' (or 'Studio {Neighborhood}' if bedrooms=0). Example: French '2 Pièces Batignolles' with bedrooms=1 → English '1-Bedroom Apartment Batignolles'.\n" +
  "- For the description: when re-stating the apartment type at the start, use the bedrooms count not the pièces count. Example: French '4 pièces de standing d\\'environ 105 m²...' with bedrooms=2 → English '2-bedroom high-end apartment of approximately 105 sqm...'.\n" +
  "- Common French real estate vocabulary you MUST translate:\n" +
  "    salon → living room ; séjour → living room ; salle à manger → dining room ; coin repas → dining area ; table à manger → dining table ; cuisine → kitchen ; cuisine équipée → equipped kitchen ; cuisine ouverte → open kitchen ; cuisine séparée → separate kitchen ; chambre → bedroom ; chambre parentale → master bedroom ; salle de bain / salle d'eau → bathroom ; douche à l'italienne → walk-in shower ; baignoire → bathtub ; WC séparé / toilettes séparées → separate toilet ; rangement / rangements → storage ; placard / placards → cupboard / cupboards ; dressing → walk-in closet ; entrée → entrance ; balcon → balcony ; terrasse → terrace ; cave → cellar ; parking → parking ; étage → floor ; ascenseur → elevator ; sans ascenseur → no elevator ; immeuble haussmannien → Haussmann building ; immeuble ancien → classic building ; immeuble moderne → modern building ; immeuble récent → recent building ; sécurisé → secured ; gardien → concierge ; digicode → keypad entry ; interphone → intercom ; sur cour → courtyard side ; sur rue → street side ; calme → quiet ; lumineux / claire → bright ; spacieux → spacious ; haut de gamme / de standing → high-end ; rénové / refait à neuf → renovated ; entièrement refait à neuf → completely renovated ; meublé et équipé → furnished and equipped ; chauffage → heating ; chauffage collectif → central heating ; chauffage individuel → individual heating ; chauffage électrique → electric heating ; chauffage gaz → gas heating ; eau chaude → hot water ; eau chaude collective → central hot water ; double vitrage → double glazing ; volets roulants → roller shutters ; parquet → parquet flooring ; parquet point de Hongrie → herringbone parquet ; canapé → sofa ; canapé convertible → sofa bed ; canapé d'angle → corner sofa ; lit double → double bed ; lit simple → single bed ; lit Queen size → queen-size bed ; lit superposé → bunk bed ; télévision / TV écran plat → flat-screen TV ; Smart TV → Smart TV ; tous commerces → all amenities / shops nearby ; commodités → amenities ; à proximité de → close to ; transports en commun → public transport ; métro → subway / metro ; RER → suburban train (RER) ; bus → bus.\n" +
  "- Common features glossary (use EXACTLY these mappings):\n" +
  "    Wifi → Wi-Fi ; Lave-linge → Washing machine ; Sèche-linge → Dryer ; Lave-linge séchant → Washer-dryer ; Four → Oven ; Four traditionnel → Traditional oven ; Micro-ondes / Four micro-onde → Microwave ; Réfrigérateur → Refrigerator ; Congélateur → Freezer ; Lave-vaisselle → Dishwasher ; Cuisine équipée → Equipped kitchen ; Plaques de cuisson → Cooktop ; Bouilloire → Kettle ; Toaster / Grille-pain → Toaster ; Machine Nespresso → Nespresso machine ; Aspirateur → Vacuum cleaner ; Fer à repasser → Iron ; Table à repasser → Ironing board ; Sèche-cheveux → Hair dryer ; Télévision 4K / Smart TV → Smart TV ; Double vitrage → Double glazing ; Parquet → Parquet flooring ; Parquet point de Hongrie → Herringbone parquet ; Ascenseur → Elevator ; Digicode → Keypad entry ; Interphone → Intercom ; Gardien → Concierge ; Fibre optique → Fiber optic internet ; Chauffage électrique individuel → Individual electric heating ; Chauffage individuel gaz → Individual gas heating ; Chauffage collectif → Central heating ; Climatisation → Air conditioning ; Douche à l'italienne → Walk-in shower ; Baignoire → Bathtub ; Toilettes séparées → Separate toilet ; Balcon → Balcony ; Terrasse → Terrace ; Cave → Cellar ; Parking → Parking ; Canapé convertible → Sofa bed ; Lit double → Double bed ; Lit simple → Single bed ; Lit Queen size → Queen size bed ; Lit superposé → Bunk bed ; Draps fournis → Bed linen provided ; Linge de maison fourni → Household linen provided ; Serviettes fournies → Towels provided ; Volets roulants → Roller shutters.\n" +
  "Return ONLY valid JSON with no preamble, no code fences, no commentary.";

const args = process.argv.slice(2);
const targetSlug = args.find(a => a.startsWith("--slug="))?.split("=")[1];
const force = args.includes("--force");

const apartments = JSON.parse(readFileSync(APARTMENTS_PATH, "utf-8"));
console.log(`Loaded ${apartments.length} apartments`);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function isFrenchContaminated(text) {
  if (!text) return true;
  const frenchMarkers = /\b(étage|salon|séjour|salle de bain|salle d'eau|coin repas|table à manger|rangement|accès|eau chaude|chauffage|tous commerces|commodités|à proximité|chambre parentale|cuisine équipée|cuisine ouverte|sur cour|sur rue|sans ascenseur|avec ascenseur|haussmannien|baignoire|placard|dressing|tout équipé|tout equipped|de standing|en parfait état|à pied|n°|pièces?\b|chambres?\b|d'eau)\b/i;
  return frenchMarkers.test(text);
}

async function translateOne(apt) {
  const input = {
    title: String(apt.title ?? ""),
    description: String(apt.description ?? ""),
    floor: String(apt.floor ?? ""),
    features: Array.isArray(apt.features) ? apt.features : [],
    bedrooms: typeof apt.bedrooms === "number" ? apt.bedrooms : undefined,
    rooms: typeof apt.rooms === "number" ? apt.rooms : undefined,
  };

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Translate these apartment listing fields from French to English. Return strictly JSON with exactly these fields: title (string), description (string), floor (string), features (array of strings, same order and length as input).\n\nInput:\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in Claude response");
  }
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < apartments.length; i++) {
    const apt = apartments[i];
    if (targetSlug && apt.slug !== targetSlug) continue;

    const needsTranslation =
      force ||
      !apt.title_en ||
      !apt.description_en ||
      !apt.floor_en ||
      !apt.features_en ||
      isFrenchContaminated(apt.description_en) ||
      isFrenchContaminated(apt.title_en);

    if (!needsTranslation) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`[${i + 1}/${apartments.length}] ${apt.slug}... `);
      const out = await translateOne(apt);
      apt.title_en = out.title;
      apt.description_en = out.description;
      apt.floor_en = out.floor || apt.floor_en || "";
      if (Array.isArray(out.features)) apt.features_en = out.features.map(String);
      translated++;
      console.log("OK");
      // Save incrementally so we don't lose progress
      writeFileSync(APARTMENTS_PATH, JSON.stringify(apartments, null, 2), "utf-8");
      // Throttle to be polite to the API
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Translated: ${translated}`);
  console.log(`Skipped (already clean): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Bulk-translate all apartments in src/data/apartments.json to English.
 *
 * Idempotent: skips any apartment that already has title_en + description_en +
 * floor_en + features_en (non-empty). Writes back to apartments.json after
 * every apartment so a crash mid-run doesn't lose progress.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node scripts/translate-all.mjs
 *   node scripts/translate-all.mjs --force   # retranslate everything
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const DATA_PATH = path.resolve("src/data/apartments.json");
const MODEL = "claude-haiku-4-5-20251001"; // cheap + excellent at translation
const FORCE = process.argv.includes("--force");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY missing. Run: export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const SYSTEM = `You translate French real estate listings for a luxury corporate rental agency in Paris into polished English for an international executive audience.

Rules:
- Professional, elegant tone (premium service rental).
- Units: "m²" → "sqm".
- Floors: "rez-de-chaussée" → "ground floor", "1er étage" → "1st floor", "2e étage" → "2nd floor", "3e étage" → "3rd floor", "4e étage" → "4th floor" (and so on).
- Keep proper nouns untouched: street names, Paris district names (Batignolles, Chaillot, Passy, Auteuil, Marais...), "Paris 17e" can become "Paris 17th arrondissement".
- Common features glossary (use EXACTLY these):
    "Wifi" → "Wifi"
    "Lave-linge" → "Washing machine"
    "Sèche-linge" → "Dryer"
    "Four" → "Oven"
    "Four traditionnel" → "Traditional oven"
    "Micro-ondes" / "Four micro-onde" → "Microwave"
    "Réfrigérateur" → "Refrigerator"
    "Congélateur" → "Freezer"
    "Lave-vaisselle" → "Dishwasher"
    "Cuisine équipée" → "Equipped kitchen"
    "Plaques de cuisson" → "Cooktop"
    "Bouilloire" → "Kettle"
    "Toaster" / "Grille-pain" → "Toaster"
    "Machine Nespresso" → "Nespresso machine"
    "Aspirateur" → "Vacuum cleaner"
    "Fer à repasser" → "Iron"
    "Table à repasser" → "Ironing board"
    "Sèche-cheveux" → "Hair dryer"
    "Télévision 4K" / "Smart TV" → "Smart TV"
    "Double vitrage" → "Double glazing"
    "Parquet point de Hongrie" → "Herringbone parquet"
    "Ascenseur" → "Elevator"
    "Digicode" → "Keypad entry"
    "Interphone" → "Intercom"
    "Gardien" → "Concierge"
    "Fibre optique" → "Fiber optic internet"
    "Chauffage électrique individuel" → "Individual electric heating"
    "Douche à l'italienne" → "Walk-in shower"
    "Climatisation" → "Air conditioning"
    "Balcon" → "Balcony"
    "Terrasse" → "Terrace"
    "Cave" → "Cellar"
    "Parking" → "Parking"

Return ONLY a valid JSON object — no preamble, no code fences, no trailing prose.`;

function buildUserPrompt(apt) {
  return `Translate these fields. Return strict JSON with exactly these keys: title (string), description (string), floor (string), features (array of strings, same length and order as input).

Input:
${JSON.stringify(
    { title: apt.title, description: apt.description, floor: apt.floor, features: apt.features ?? [] },
    null,
    2,
  )}`;
}

async function translateOne(apt) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(apt) }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
  const m = textBlock.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no json in response");
  const parsed = JSON.parse(m[0]);
  if (typeof parsed.title !== "string" || typeof parsed.description !== "string") {
    throw new Error("invalid json shape");
  }
  return {
    title_en: parsed.title,
    description_en: parsed.description,
    floor_en: typeof parsed.floor === "string" ? parsed.floor : apt.floor,
    features_en: Array.isArray(parsed.features) ? parsed.features.map(String) : (apt.features ?? []),
  };
}

function isDone(apt) {
  return (
    typeof apt.title_en === "string" && apt.title_en.trim() &&
    typeof apt.description_en === "string" && apt.description_en.trim() &&
    typeof apt.floor_en === "string" && apt.floor_en.trim() &&
    Array.isArray(apt.features_en) && apt.features_en.length === (apt.features?.length ?? 0)
  );
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const apartments = JSON.parse(raw);
  console.log(`Loaded ${apartments.length} apartments from ${DATA_PATH}`);
  console.log(`Model: ${MODEL}  Force: ${FORCE}`);

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < apartments.length; i++) {
    const apt = apartments[i];
    if (!FORCE && isDone(apt)) {
      skipped++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${apartments.length}] ${apt.slug} ... `);
    try {
      const t = await translateOne(apt);
      apartments[i] = { ...apt, ...t };
      fs.writeFileSync(DATA_PATH, JSON.stringify(apartments, null, 2) + "\n");
      translated++;
      console.log(`ok  "${t.title_en}"`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${err?.message ?? err}`);
    }
  }

  console.log("");
  console.log(`Done. translated=${translated} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import Anthropic from "@anthropic-ai/sdk";

type TranslateInput = {
  title: string;
  description: string;
  floor: string;
  features: string[];
  /**
   * Actual number of bedrooms (canonical, set by admin).
   * Source of truth for English translation: in French "X pièces" counts the
   * living room as 1 piece, but the apartment can have a double living room
   * or other configurations, so we never compute bedrooms from pièces — we
   * use the bedrooms field directly.
   */
  bedrooms?: number;
  /** Number of "pièces" (rooms in the French sense). For context only. */
  rooms?: number;
};

type TranslateOutput = {
  title_en: string;
  description_en: string;
  floor_en: string;
  features_en: string[];
};

export type TranslateError =
  | { kind: "no_key" }
  | { kind: "api_error"; message: string }
  | { kind: "bad_response"; message: string };

const SYSTEM_PROMPT =
  "You translate French real estate listings for a luxury corporate rental agency in Paris into polished English for an international executive audience.\n\n" +
  "Rules:\n" +
  "- Professional, elegant tone (premium service rental).\n" +
  "- Units: 'm²' → 'sqm'.\n" +
  "- Floors: 'rez-de-chaussée' → 'ground floor', '1er étage' → '1st floor', '2e étage' → '2nd floor', '3e étage' → '3rd floor', and so on.\n" +
  "- Keep proper nouns untouched: street names, Paris districts (Batignolles, Chaillot, Passy, Auteuil, Marais...). 'Paris 17e' can become 'Paris 17th arrondissement'.\n" +
  "- BEDROOM COUNT IS CRITICAL. In French, 'X pièces' counts the living room as 1 piece (so '2 pièces' often = 1 bedroom + 1 living room). BUT some apartments have a double living room, so the formula bedrooms = pièces - 1 is NOT always correct. The input includes a 'bedrooms' field that is the canonical, admin-validated number of bedrooms. ALWAYS use the bedrooms field as source of truth for the English title and description. Examples:\n" +
  "    French '2 pièces' with bedrooms=1 → English '1-bedroom apartment'.\n" +
  "    French '4 pièces' with bedrooms=2 → English '2-bedroom apartment' (apartment has a double living room).\n" +
  "    French '4 pièces' with bedrooms=3 → English '3-bedroom apartment'.\n" +
  "    French 'X chambres' with bedrooms=Y → use Y as the English bedroom count (the title may even say 'X chambres' with Y different).\n" +
  "    bedrooms=0 → 'studio'.\n" +
  "- For the title, use the format '{N}-Bedroom Apartment {Neighborhood}' (or 'Studio {Neighborhood}' if bedrooms=0). Example: French '2 Pièces Batignolles' with bedrooms=1 → English '1-Bedroom Apartment Batignolles'.\n" +
  "- For the description, when re-stating the apartment type at the start, use the bedrooms count not the pièces count. Example: French description starting with '4 pièces de standing d'environ 105 m²...' with bedrooms=2 → English description starting with '2-bedroom high-end apartment of approximately 105 sqm...'.\n" +
  "- Common features glossary (use EXACTLY these mappings):\n" +
  "    Wifi → Wifi ; Lave-linge → Washing machine ; Sèche-linge → Dryer ; Four → Oven ; Four traditionnel → Traditional oven ; Micro-ondes / Four micro-onde → Microwave ; Réfrigérateur → Refrigerator ; Congélateur → Freezer ; Lave-vaisselle → Dishwasher ; Cuisine équipée → Equipped kitchen ; Plaques de cuisson → Cooktop ; Bouilloire → Kettle ; Toaster / Grille-pain → Toaster ; Machine Nespresso → Nespresso machine ; Aspirateur → Vacuum cleaner ; Fer à repasser → Iron ; Table à repasser → Ironing board ; Sèche-cheveux → Hair dryer ; Télévision 4K / Smart TV → Smart TV ; Double vitrage → Double glazing ; Parquet point de Hongrie → Herringbone parquet ; Ascenseur → Elevator ; Digicode → Keypad entry ; Interphone → Intercom ; Gardien → Concierge ; Fibre optique → Fiber optic internet ; Chauffage électrique individuel → Individual electric heating ; Douche à l'italienne → Walk-in shower ; Climatisation → Air conditioning ; Balcon → Balcony ; Terrasse → Terrace ; Cave → Cellar ; Parking → Parking.\n" +
  "Return ONLY valid JSON with no preamble, no code fences, no commentary.";

export async function translateApartment(
  input: TranslateInput,
): Promise<TranslateOutput | TranslateError> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY missing — skipping auto-translation");
    return { kind: "no_key" };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Translate these apartment listing fields from French to English. Return strictly JSON with exactly these fields: title (string), description (string), floor (string), features (array of strings, same order and length as input).

Input:
${JSON.stringify(input, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { kind: "bad_response", message: "no_text_block" };
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { kind: "bad_response", message: "no_json_in_response" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string"
    ) {
      return { kind: "bad_response", message: "missing_title_or_description" };
    }

    return {
      title_en: parsed.title,
      description_en: parsed.description,
      floor_en:
        typeof parsed.floor === "string" ? parsed.floor : input.floor,
      features_en: Array.isArray(parsed.features)
        ? parsed.features.map(String)
        : input.features,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Translation error:", message);
    return { kind: "api_error", message };
  }
}

export function isTranslateError(
  x: TranslateOutput | TranslateError,
): x is TranslateError {
  return (x as TranslateError).kind !== undefined;
}

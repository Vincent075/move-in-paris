import Anthropic from "@anthropic-ai/sdk";

type TranslateInput = {
  title: string;
  description: string;
  floor: string;
  features: string[];
};

type TranslateOutput = {
  title_en: string;
  description_en: string;
  floor_en: string;
  features_en: string[];
};

export async function translateApartment(
  input: TranslateInput,
): Promise<TranslateOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY missing — skipping auto-translation");
    return null;
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      system:
        "You translate French real estate listings for a luxury corporate rental agency in Paris into English for an international executive audience. Maintain a polished, professional tone. Convert units: 'm²' → 'sqm'. Convert floors naturally: '2e étage' → '2nd floor', 'rez-de-chaussée' → 'ground floor', '1er étage' → '1st floor'. Keep proper nouns (street names, district names like 'Batignolles') untranslated. Return ONLY valid JSON with no preamble, no code fences, no commentary.",
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
    if (!textBlock || textBlock.type !== "text") return null;

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string"
    ) {
      return null;
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
    console.error("Translation error:", err);
    return null;
  }
}

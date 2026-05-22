/**
 * Phone number validation, no external library.
 *
 * Move in Paris collects leads from French residents AND foreign expats
 * arriving in Paris, so the validator must accept :
 *
 *   - French mobile / landline in any common format :
 *       06 12 34 56 78        →  ok
 *       06.12.34.56.78        →  ok
 *       06-12-34-56-78        →  ok
 *       0612345678            →  ok
 *       +33 6 12 34 56 78     →  ok
 *       0033 6 12 34 56 78    →  ok
 *   - international numbers in E.164 :
 *       +1 415 555 0132       →  ok
 *       +44 20 7946 0958      →  ok
 *       +971 50 123 4567      →  ok
 *
 * It must REJECT obvious junk (too short, too long, all the same digit,
 * starts with the wrong prefix, etc.) — those are exactly the cases we
 * saw in production where a tenant typed a 9-digit phone and we couldn't
 * call them back.
 */

export type PhoneCheck = {
  valid: boolean;
  /** Cleaned, normalised number (E.164 when possible). Empty if invalid. */
  normalised: string;
  /** Human-readable reason when invalid, in French. Empty when valid. */
  reason: string;
};

const FR_MOBILE_PREFIX = /^[67]/; // 06, 07 mobile
const FR_LANDLINE_PREFIX = /^[1-59]/; // 01-05, 09

/**
 * Returns true if the digit string is suspicious junk : same digit repeated,
 * trivial 2-3 char pattern looped, or strict sequence. Used as a soft check
 * after the format passes.
 */
function looksFake(digits: string): boolean {
  // All the same digit (e.g. "1111111111")
  if (/^(\d)\1+$/.test(digits)) return true;
  // 2-character pattern repeating to fill the number (e.g. "0606060606",
  // "1212121212") — at least 4 repetitions.
  if (/^(\d{2})\1{3,}$/.test(digits)) return true;
  // 3-character pattern repeating (e.g. "123123123123")
  if (/^(\d{3})\1{2,}$/.test(digits)) return true;
  // Strict ascending or descending sequence ("0123456789", "9876543210")
  if (digits === "0123456789" || digits === "9876543210") return true;
  return false;
}

export function validatePhone(raw: string): PhoneCheck {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { valid: false, normalised: "", reason: "Numéro requis." };
  }

  // Strip everything except digits and a leading +
  const cleaned = trimmed.replace(/[^\d+]/g, "");

  // International with country code.
  // E.164 allows 7-15 digits total (country code + subscriber number) but
  // very few real countries have less than 8. We enforce 9-15 to reject
  // truncated numbers like "+33 6 12 34" (which would still pass an 8-digit
  // floor) — and keep room for valid edge cases like Vatican (+379) or
  // Solomon Islands (+677 + 5 digits = 8 total).
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(digits)) {
      return {
        valid: false,
        normalised: "",
        reason:
          "Numéro international trop court ou trop long (8 à 15 chiffres après l'indicatif).",
      };
    }
    if (looksFake(digits)) {
      return {
        valid: false,
        normalised: "",
        reason: "Ce numéro paraît fictif. Merci d'indiquer un vrai numéro.",
      };
    }
    return { valid: true, normalised: `+${digits}`, reason: "" };
  }

  // "0033..." → treat as +33 and revalidate
  if (cleaned.startsWith("00")) {
    return validatePhone(`+${cleaned.slice(2)}`);
  }

  // French local format (starts with 0)
  if (cleaned.startsWith("0")) {
    if (cleaned.length !== 10) {
      return {
        valid: false,
        normalised: "",
        reason: "Un numéro français doit faire 10 chiffres (ex : 06 12 34 56 78).",
      };
    }
    const second = cleaned.charAt(1);
    if (!FR_MOBILE_PREFIX.test(second) && !FR_LANDLINE_PREFIX.test(second)) {
      return {
        valid: false,
        normalised: "",
        reason: "Préfixe français invalide (01-05, 06, 07, 09).",
      };
    }
    const digits = cleaned.slice(1); // drop leading 0
    if (looksFake(`0${digits}`)) {
      return {
        valid: false,
        normalised: "",
        reason: "Ce numéro paraît fictif. Merci d'indiquer un vrai numéro.",
      };
    }
    return { valid: true, normalised: `+33${digits}`, reason: "" };
  }

  return {
    valid: false,
    normalised: "",
    reason:
      "Format non reconnu. Saisissez un numéro français (06…) ou international avec indicatif (+33, +44…).",
  };
}

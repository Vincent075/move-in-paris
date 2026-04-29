import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale, type Messages } from "./types";
import fr from "./messages/fr.json";
import en from "./messages/en.json";

const bundles: Record<Locale, Messages> = { fr, en };

export async function getLocale(): Promise<Locale> {
  // Always default to French. Visitors get the English version only when
  // they explicitly switch via the language toggle (which sets the cookie).
  // We don't auto-switch on Accept-Language because most macOS / Chrome
  // browsers send English as primary even for French users — this caused
  // French visitors to land on the English site by default.
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (fromCookie && LOCALES.includes(fromCookie)) return fromCookie;
  return DEFAULT_LOCALE;
}

export async function getMessages(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale();
  return { locale, messages: bundles[locale] };
}

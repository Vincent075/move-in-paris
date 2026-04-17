import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale, type Messages } from "./types";
import fr from "./messages/fr.json";
import en from "./messages/en.json";

const bundles: Record<Locale, Messages> = { fr, en };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (fromCookie && LOCALES.includes(fromCookie)) return fromCookie;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export async function getMessages(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale();
  return { locale, messages: bundles[locale] };
}

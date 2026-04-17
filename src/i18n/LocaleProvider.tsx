"use client";

import { createContext, useContext, useMemo } from "react";
import { LOCALE_COOKIE, type Locale, type Messages } from "./types";

type Ctx = {
  locale: Locale;
  messages: Messages;
  setLocale: (l: Locale) => void;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(
    () => ({
      locale,
      messages,
      setLocale(l) {
        document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
        window.location.reload();
      },
    }),
    [locale, messages],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

type Path = string;

export function useT() {
  const { messages } = useLocale();
  return function t(path: Path, fallback?: string): string {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, messages);
    if (typeof value === "string") return value;
    return fallback ?? path;
  };
}

export function useTArray<T = unknown>(path: Path): T[] {
  const { messages } = useLocale();
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Picks a bilingual field from an apartment object based on current locale.
 * Falls back to the FR field when the _en variant is missing.
 * Example: pickField(apt, "title") → apt.title_en in EN, apt.title in FR.
 */
export function usePickField() {
  const { locale } = useLocale();
  return function pick<T>(obj: Record<string, unknown>, key: string, fallback?: T): T {
    if (locale === "en") {
      const enKey = `${key}_en`;
      const v = obj[enKey];
      if (v !== undefined && v !== null && v !== "") return v as T;
    }
    return (obj[key] ?? fallback) as T;
  };
}

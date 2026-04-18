"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

const COOKIE_CONSENT_KEY = "mip-cookie-consent-v1";

export type ConsentChoice = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentChoice;
  } catch {
    return null;
  }
}

function storeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(choice));
  } catch {
    /* ignore */
  }
}

export default function CookieConsent() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      setOpen(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  function persist(a: boolean, m: boolean) {
    const choice: ConsentChoice = {
      essential: true,
      analytics: a,
      marketing: m,
      timestamp: new Date().toISOString(),
    };
    storeConsent(choice);
    setAnalytics(a);
    setMarketing(m);
    setOpen(false);
    setShowDetails(false);
  }

  const handleAcceptAll = () => persist(true, true);
  const handleRejectAll = () => persist(false, false);
  const handleSave = () => persist(analytics, marketing);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Subtle scrim only when details panel is open */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-noir-deep/40 backdrop-blur-sm"
              onClick={() => setShowDetails(false)}
            />
          )}

          <motion.aside
            role="dialog"
            aria-modal={showDetails}
            aria-labelledby="cookie-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`fixed z-[100] bg-blanc shadow-2xl border border-gris-clair/60 ${
              showDetails
                ? "inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-6 sm:max-w-2xl sm:mx-auto max-h-[85vh] overflow-y-auto"
                : "inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md"
            }`}
          >
            {!showDetails ? (
              <div className="p-5 sm:p-6">
                <h2 id="cookie-title" className="font-serif text-xl text-noir mb-2">
                  {t("cookies.title")}
                </h2>
                <p className="text-gris text-sm leading-relaxed mb-4">
                  {t("cookies.intro")}{" "}
                  <Link
                    href="/politique-de-confidentialite"
                    className="text-gold underline hover:text-gold-light"
                  >
                    {t("cookies.policyLink")}
                  </Link>
                  .
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="flex-1 px-4 py-2.5 bg-gold text-noir-deep text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors"
                  >
                    {t("cookies.acceptAll")}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAll}
                    className="flex-1 px-4 py-2.5 border border-noir-deep/20 text-noir text-sm font-medium tracking-wider uppercase hover:bg-blanc-chaud transition-colors"
                  >
                    {t("cookies.rejectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="flex-1 px-4 py-2.5 text-gris text-sm font-medium tracking-wider uppercase hover:text-noir transition-colors"
                  >
                    {t("cookies.customize")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-8">
                <h2 id="cookie-title" className="font-serif text-2xl text-noir mb-6">
                  {t("cookies.title")}
                </h2>

                <div className="space-y-4 mb-6">
                  <CookieCategory
                    title={t("cookies.essentialTitle")}
                    desc={t("cookies.essentialDesc")}
                    checked
                    disabled
                    onToggle={() => {}}
                  />
                  <CookieCategory
                    title={t("cookies.analyticsTitle")}
                    desc={t("cookies.analyticsDesc")}
                    checked={analytics}
                    onToggle={() => setAnalytics((v) => !v)}
                  />
                  <CookieCategory
                    title={t("cookies.marketingTitle")}
                    desc={t("cookies.marketingDesc")}
                    checked={marketing}
                    onToggle={() => setMarketing((v) => !v)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 px-4 py-2.5 bg-gold text-noir-deep text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors"
                  >
                    {t("cookies.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="flex-1 px-4 py-2.5 border border-noir-deep/20 text-noir text-sm font-medium tracking-wider uppercase hover:bg-blanc-chaud transition-colors"
                  >
                    {t("cookies.back")}
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CookieCategory({
  title,
  desc,
  checked,
  disabled = false,
  onToggle,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-4 p-4 border border-gris-clair/50 bg-blanc-chaud/40">
      <div className="flex-1">
        <h3 className="font-serif text-base text-noir mb-1">{title}</h3>
        <p className="text-xs text-gris leading-relaxed">{desc}</p>
      </div>
      <label className={`relative inline-flex items-center mt-1 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <div className="w-10 h-5 bg-gris-clair peer-checked:bg-gold transition-colors duration-200 relative peer-disabled:opacity-60">
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white shadow transition-transform duration-200 ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </div>
      </label>
    </div>
  );
}

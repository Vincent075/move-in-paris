"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import rentTable from "@/data/encadrement/rent-table.json";
import { useT } from "@/i18n/LocaleProvider";

type BanFeature = {
  geometry?: { type: "Point"; coordinates: [number, number] };
  properties: {
    label: string;
    postcode?: string;
    city?: string;
    citycode?: string;
    context?: string;
    name?: string;
    x?: number;
    y?: number;
  };
};

type Quartier = { id: number; nom: string };

type Pieces = "1" | "2" | "3" | "4";
type Epoque = "Avant 1946" | "1946-1970" | "1971-1990" | "Apres 1990";

const EPOQUE_LABELS: Record<Epoque, string> = {
  "Avant 1946": "Avant 1946",
  "1946-1970": "1946 – 1970",
  "1971-1990": "1971 – 1990",
  "Apres 1990": "Après 1990",
};

/**
 * Fallback €/m² pour les communes hors encadrement parisien
 * (Neuilly, Levallois, Boulogne — non couverts par l'encadrement des loyers).
 * Valeurs indicatives basées sur le marché meublé corporate constaté.
 */
const FALLBACK_PER_M2: Record<string, { 1: number; 2: number; 3: number; 4: number }> = {
  "Neuilly-sur-Seine": { 1: 38, 2: 34, 3: 30, 4: 28 },
  "Levallois-Perret": { 1: 34, 2: 30, 3: 27, 4: 25 },
  "Boulogne-Billancourt": { 1: 33, 2: 29, 3: 26, 4: 24 },
};

const MIP_PREMIUM_MIN = 1.25; // +25%
const MIP_PREMIUM_MAX = 1.36; // +36%

function formatEuro(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function isParisPostcode(postcode?: string): boolean {
  if (!postcode) return false;
  return /^75[0-9]{3}$/.test(postcode);
}

function matchFallbackCity(city?: string, postcode?: string): string | null {
  const c = (city || "").toLowerCase();
  if (postcode === "92200" || c.includes("neuilly")) return "Neuilly-sur-Seine";
  if (postcode === "92300" || c.includes("levallois")) return "Levallois-Perret";
  if (postcode === "92100" || c.includes("boulogne-billancourt"))
    return "Boulogne-Billancourt";
  return null;
}

type Step = "property" | "contact" | "result";

export default function EstimationForm({
  contactFirst = false,
}: { contactFirst?: boolean } = {}) {
  const t = useT();
  const EPOCH_T: Record<Epoque, string> = {
    "Avant 1946": t("estimationPage.epochBefore1946"),
    "1946-1970": t("estimationPage.epoch1946_1970"),
    "1971-1990": t("estimationPage.epoch1971_1990"),
    "Apres 1990": t("estimationPage.epochAfter1990"),
  };
  const [step, setStep] = useState<Step>(contactFirst ? "contact" : "property");
  const [submitting, setSubmitting] = useState(false);

  // Property fields
  const [address, setAddress] = useState("");
  const [latLon, setLatLon] = useState<[number, number] | null>(null);
  const [postcode, setPostcode] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [quartier, setQuartier] = useState<Quartier | null>(null);
  const [fallbackCity, setFallbackCity] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [rooms, setRooms] = useState<Pieces | "">("");
  const [surface, setSurface] = useState("");
  const [epoch, setEpoch] = useState<Epoque>("Apres 1990");

  // Contact fields
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleAddressInput(value: string) {
    setAddress(value);
    setQuartier(null);
    setLatLon(null);
    setPostcode(null);
    setCity(null);
    setFallbackCity(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setSuggestOpen(true);
    setSuggestLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=6&type=housenumber`
        );
        const data = await res.json();
        setSuggestions((data.features || []) as BanFeature[]);
      } catch {
        setSuggestions([]);
      }
      setSuggestLoading(false);
    }, 220);
  }

  async function pickSuggestion(f: BanFeature) {
    const p = f.properties;
    setAddress(p.label);
    setSuggestOpen(false);
    setSuggestions([]);

    const coords = f.geometry?.coordinates;
    if (coords) {
      const [lon, lat] = coords;
      setLatLon([lat, lon]);
    }
    setPostcode(p.postcode || null);
    setCity(p.city || null);

    // Try Paris quartier lookup
    if (isParisPostcode(p.postcode) && coords) {
      const [lon, lat] = coords;
      setResolving(true);
      try {
        const res = await fetch(`/api/quartier?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data.quartier) {
          setQuartier(data.quartier);
          setFallbackCity(null);
        }
      } catch { /* ignore */ }
      setResolving(false);
      return;
    }

    // Fallback for non-Paris communes we support
    const fb = matchFallbackCity(p.city, p.postcode);
    if (fb) {
      setFallbackCity(fb);
      setQuartier(null);
    }
  }

  const computation = useMemo(() => {
    if (!rooms || !surface) return null;
    const s = parseFloat(surface);
    if (!s || s <= 0) return null;

    let pricePerM2: number | null = null;

    if (quartier) {
      const key = `${quartier.id}|${rooms}|${epoch}`;
      const entry = (rentTable as Record<string, { max: number; ref: number; min: number }>)[key];
      if (entry) pricePerM2 = entry.max;
    } else if (fallbackCity) {
      const t = FALLBACK_PER_M2[fallbackCity];
      if (t) pricePerM2 = t[parseInt(rooms, 10) as 1 | 2 | 3 | 4] ?? t[4];
    }

    if (pricePerM2 == null) return null;

    const loyerMajore = Math.round(pricePerM2 * s);
    const loyerMIPMin = Math.round(loyerMajore * MIP_PREMIUM_MIN);
    const loyerMIPMax = Math.round(loyerMajore * MIP_PREMIUM_MAX);
    return {
      pricePerM2: Math.round(pricePerM2 * 100) / 100,
      loyerMajore,
      loyerMIPMin,
      loyerMIPMax,
      bonusMin: loyerMIPMin - loyerMajore,
      bonusMax: loyerMIPMax - loyerMajore,
    };
  }, [quartier, fallbackCity, rooms, surface, epoch]);

  const zoneLabel = quartier
    ? `${quartier.nom} (Paris${postcode ? " — " + postcode : ""})`
    : fallbackCity
    ? fallbackCity
    : null;

  const addressValid = !!quartier || !!fallbackCity;
  const canContinue = addressValid && !!rooms && !!surface && !!computation;

  // Partial lead capture: we DON'T send immediately when step 1 completes,
  // to avoid sending 2 emails when the lead finishes the full estimation.
  // Instead: arm a 90s timer + a page-unload beacon. If step 2 completes
  // first, both are cancelled → only the full estimation email is sent.
  const partialSentRef = useRef(false);
  const partialTimerRef = useRef<number | null>(null);
  const unloadHandlerRef = useRef<(() => void) | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  function buildPartialPayload() {
    return JSON.stringify({
      formType: "owner-lead-partial",
      civilite,
      prenom,
      nom,
      email,
      telephone,
    });
  }

  function sendPartialViaFetch() {
    if (partialSentRef.current) return;
    partialSentRef.current = true;
    // Non-blocking
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildPartialPayload(),
    }).catch(() => {});
  }

  function sendPartialViaBeacon() {
    if (partialSentRef.current) return;
    if (typeof navigator === "undefined" || !navigator.sendBeacon) {
      sendPartialViaFetch();
      return;
    }
    partialSentRef.current = true;
    const blob = new Blob([buildPartialPayload()], { type: "application/json" });
    navigator.sendBeacon("/api/contact", blob);
  }

  function armPartialCapture() {
    // 90s timer: if the user stays on page without completing step 2
    partialTimerRef.current = window.setTimeout(sendPartialViaFetch, 90_000);
    // Unload / visibility: if the user closes the tab / switches apps
    const onUnload = () => sendPartialViaBeacon();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendPartialViaBeacon();
    };
    window.addEventListener("pagehide", onUnload);
    document.addEventListener("visibilitychange", onVisibility);
    unloadHandlerRef.current = onUnload;
    visibilityHandlerRef.current = onVisibility;
  }

  function disarmPartialCapture() {
    // Called when the user completes step 2 so the partial email is NOT sent.
    partialSentRef.current = true;
    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }
    if (unloadHandlerRef.current) {
      window.removeEventListener("pagehide", unloadHandlerRef.current);
      unloadHandlerRef.current = null;
    }
    if (visibilityHandlerRef.current) {
      document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }
  }

  // Cleanup any listeners / timer if the component unmounts
  useEffect(() => {
    return () => {
      if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
      if (unloadHandlerRef.current) window.removeEventListener("pagehide", unloadHandlerRef.current);
      if (visibilityHandlerRef.current) document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
    };
  }, []);

  async function sendFullEstimation() {
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formType: "estimation",
        civilite,
        prenom,
        nom,
        email,
        telephone,
        adresse: address,
        zone: zoneLabel || "",
        quartier: quartier?.nom || "",
        pieces: rooms,
        surface,
        epoch,
        loyerMajore: computation?.loyerMajore,
        loyerMIPMin: computation?.loyerMIPMin,
        loyerMIPMax: computation?.loyerMIPMax,
        pricePerM2: computation?.pricePerM2,
      }),
    });
  }

  async function handleSubmitContact(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!consent) {
      setErrorMsg("Merci de valider le consentement RGPD.");
      return;
    }
    setSubmitting(true);
    try {
      if (contactFirst) {
        // Step 1 → 2: we DON'T send the partial email now. We arm a
        // 90s timer + unload beacon instead. If the user completes step 2
        // quickly, we disarm and only the full estimation email is sent.
        armPartialCapture();
        setStep("property");
      } else {
        await sendFullEstimation();
        setStep("result");
      }
    } catch {
      setErrorMsg(t("estimationPage.errorRetry"));
    }
    setSubmitting(false);
  }

  // Final submit from the property step in contactFirst mode.
  async function handleSubmitFromProperty() {
    setErrorMsg("");
    if (!canContinue) return;
    // Cancel the partial send immediately — the lead is about to complete.
    disarmPartialCapture();
    setSubmitting(true);
    try {
      await sendFullEstimation();
      setStep("result");
    } catch {
      setErrorMsg(t("estimationPage.errorRetry"));
    }
    setSubmitting(false);
  }

  return (
    <section className={`${contactFirst ? "pt-2 pb-12" : "py-16 md:py-20"} bg-blanc overflow-x-hidden`}>
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        {/* Progress dots — hidden in contactFirst (landing) mode per design */}
        {!contactFirst && (
          <div className="flex items-center justify-center gap-3 mb-12">
            {(["property", "contact", "result"] as Step[]).map((s, i) => {
              const done =
                (step === "contact" && s === "property") ||
                (step === "result" && s !== "result");
              const active = step === s;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 flex items-center justify-center text-xs font-medium transition-all ${
                      active
                        ? "bg-gold text-noir-deep"
                        : done
                        ? "bg-noir-deep text-gold"
                        : "bg-gris-clair text-gris"
                    }`}
                    style={{ borderRadius: 10 }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-px w-10 md:w-16 ${
                        done ? "bg-gold" : "bg-gris-clair"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1 — Property info */}
          {step === "property" && (
            <motion.div
              key="property"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blanc-chaud p-8 md:p-12"
              style={{ borderRadius: 10 }}
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                {contactFirst ? "Étape 2/2 — Votre bien" : t("estimationPage.stepPropertyBadge")}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-noir mt-2 mb-4">
                {contactFirst ? "Décrivez votre appartement" : t("estimationPage.stepPropertyTitle")}
              </h2>

              {/* Contact recap when we arrive here in contactFirst mode */}
              {contactFirst && (prenom || nom || email) && (
                <div className="mb-6 p-4 bg-blanc border border-gris-clair/50 text-sm flex items-center justify-between flex-wrap gap-3" style={{ borderRadius: 10 }}>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-1">Vos coordonnées</div>
                    <div className="text-noir">
                      {prenom} {nom}
                      {email ? <span className="text-gris"> — {email}</span> : null}
                      {telephone ? <span className="text-gris"> — {telephone}</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("contact")}
                    className="text-xs text-gold hover:text-gold-dark underline"
                  >
                    Modifier
                  </button>
                </div>
              )}

              <div className="space-y-5">
                <div ref={wrapperRef} className="relative">
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    {t("estimationPage.addressLabel")}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setSuggestOpen(true);
                    }}
                    placeholder={t("estimationPage.addressPlaceholder")}
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  />
                  {suggestOpen && (suggestLoading || suggestions.length > 0) && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 bg-blanc border border-gris-clair/60 shadow-xl shadow-noir-deep/10 z-20 max-h-72 overflow-y-auto"
                      style={{ borderRadius: 10 }}
                    >
                      {suggestLoading && suggestions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gris italic">{t("estimationPage.searching")}</div>
                      )}
                      {suggestions.map((f, i) => {
                        const p = f.properties;
                        return (
                          <button
                            type="button"
                            key={`${p.label}-${i}`}
                            onClick={() => pickSuggestion(f)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-blanc-chaud transition-colors border-b border-gris-clair/30 last:border-b-0"
                          >
                            <div className="text-noir">{p.label}</div>
                            <div className="text-xs text-gris mt-0.5">
                              {p.postcode} {p.city}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Status line */}
                  <div className="text-xs mt-2 min-h-[1.25em]">
                    {resolving && (
                      <span className="text-gris italic">{t("estimationPage.identifyingDistrict")}</span>
                    )}
                    {!resolving && quartier && (
                      <span className="text-gold">
                        ✓ {t("estimationPage.districtDetected")} : <strong>{quartier.nom}</strong> — Paris {postcode}
                      </span>
                    )}
                    {!resolving && !quartier && fallbackCity && (
                      <span className="text-gold">
                        ✓ {t("estimationPage.zone")} : <strong>{fallbackCity}</strong>
                      </span>
                    )}
                    {!resolving && !quartier && !fallbackCity && address.length > 3 && !suggestOpen && (
                      <span className="text-gris italic">
                        {t("estimationPage.selectSuggestion")}
                      </span>
                    )}
                    {!resolving && !quartier && !fallbackCity && !address && (
                      <span className="text-gris italic">
                        {t("estimationPage.selectSuggestionEmpty")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.surfaceLabel")}
                    </label>
                    <input
                      required
                      type="number"
                      min={8}
                      max={500}
                      value={surface}
                      onChange={(e) => setSurface(e.target.value)}
                      placeholder="62"
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.roomsLabel")}
                    </label>
                    <select
                      required
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value as Pieces | "")}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="">{t("estimationPage.selectPrompt")}</option>
                      <option value="1">{t("estimationPage.roomStudio")}</option>
                      <option value="2">{t("estimationPage.room2")}</option>
                      <option value="3">{t("estimationPage.room3")}</option>
                      <option value="4">{t("estimationPage.room4")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    {t("estimationPage.epochLabel")}
                  </label>
                  <select
                    value={epoch}
                    onChange={(e) => setEpoch(e.target.value as Epoque)}
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  >
                    {(Object.keys(EPOCH_T) as Epoque[]).map((v) => (
                      <option key={v} value={v}>
                        {EPOCH_T[v]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={!canContinue || submitting}
                onClick={contactFirst ? handleSubmitFromProperty : () => setStep("contact")}
                className={`w-full mt-8 py-4 font-medium tracking-wider uppercase text-sm transition-all ${
                  canContinue && !submitting
                    ? "bg-gold text-noir-deep hover:bg-gold-light"
                    : "bg-gris-clair text-gris cursor-not-allowed"
                }`}
                style={{ borderRadius: 10 }}
              >
                {submitting
                  ? "Envoi en cours…"
                  : contactFirst
                  ? "Recevoir mon estimation"
                  : t("estimationPage.getEstimate")}
              </button>

              {errorMsg && contactFirst && (
                <p className="text-red-500 text-xs mt-3 text-center">{errorMsg}</p>
              )}

              <p className="text-xs text-gris mt-4 italic">
                {t("estimationPage.calcNote")}
              </p>
            </motion.div>
          )}

          {/* STEP 2 — Contact */}
          {step === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blanc-chaud p-8 md:p-12"
              style={{ borderRadius: 10 }}
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                {contactFirst ? "Étape 1/2 — Vos coordonnées" : t("estimationPage.stepContactBadge")}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-noir mt-2 mb-2">
                {contactFirst ? "Votre estimation s'affiche juste après" : t("estimationPage.stepContactTitle")}
              </h2>
              <p className="text-gris text-sm mb-8">
                {contactFirst
                  ? "Proposition détaillée et plaquette Move in Paris envoyées par email en quelques secondes."
                  : t("estimationPage.stepContactIntro")}
              </p>

              {/* Property recap — only shown in default mode (property was filled first) */}
              {!contactFirst && (
                <div
                  className="mb-6 p-5 bg-blanc border border-gris-clair/50 text-sm"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                    {t("estimationPage.yourProperty")}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-y-1 text-noir">
                    <div>
                      <span className="text-gris">{t("estimationPage.district")} :</span> {zoneLabel || "—"}
                    </div>
                    <div>
                      <span className="text-gris">{t("estimationPage.surface")} :</span> {surface} m²
                    </div>
                    <div>
                      <span className="text-gris">{t("estimationPage.rooms")} :</span>{" "}
                      {rooms === "4"
                        ? t("estimationPage.room4")
                        : rooms === "1"
                        ? t("estimationPage.roomStudio")
                        : rooms === "2"
                        ? t("estimationPage.room2")
                        : rooms === "3"
                        ? t("estimationPage.room3")
                        : "—"}
                    </div>
                    <div>
                      <span className="text-gris">{t("estimationPage.epoch")} :</span> {EPOCH_T[epoch]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("property")}
                    className="mt-3 text-xs text-gold hover:text-gold-dark underline"
                  >
                    {t("estimationPage.modify")}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitContact} className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.civility")}
                    </label>
                    <select
                      value={civilite}
                      onChange={(e) => setCivilite(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="">—</option>
                      <option value="M.">{t("estimationPage.mr")}</option>
                      <option value="Mme">{t("estimationPage.mrs")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.firstName")}
                    </label>
                    <input
                      required
                      type="text"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.lastName")}
                    </label>
                    <input
                      required
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.email")}
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      {t("estimationPage.phone")}
                    </label>
                    <input
                      required
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-xs text-gris leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 accent-[#B88B58]"
                  />
                  <span>{t("estimationPage.consent")}</span>
                </label>

                {errorMsg && (
                  <div className="text-sm text-red-500">{errorMsg}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all ${
                    submitting
                      ? "bg-gris text-blanc cursor-wait"
                      : "bg-gold text-noir-deep hover:bg-gold-light"
                  }`}
                  style={{ borderRadius: 10 }}
                >
                  {submitting
                    ? t("estimationPage.sending")
                    : contactFirst
                    ? "Suivant : décrire mon bien →"
                    : t("estimationPage.revealEstimate")}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3 — Result */}
          {step === "result" && computation && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-noir-deep p-10 md:p-14 text-blanc relative overflow-hidden"
              style={{ borderRadius: 10 }}
            >
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(197,160,89,0.5) 1px, transparent 0)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="relative">
                <span className="text-gold text-xs tracking-[0.3em] uppercase">
                  {t("estimationPage.resultBadge")}
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-blanc mt-3 mb-2">
                  {t("estimationPage.resultThanks")} {prenom} !
                </h2>
                <p className="text-blanc/60 text-sm mb-10">
                  {t("estimationPage.resultIntro")} ({surface} m², {zoneLabel}).
                </p>

                <div
                  className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 p-8 mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                    {t("estimationPage.rangeLabel")}
                  </div>
                  <div className="font-serif text-4xl md:text-5xl text-gold font-bold leading-tight">
                    {formatEuro(computation.loyerMIPMin)} €
                    <span className="text-blanc/60 mx-3">–</span>
                    {formatEuro(computation.loyerMIPMax)} €
                  </div>
                  <div className="text-blanc/70 text-sm mt-3">
                    {t("estimationPage.roughly")}{" "}
                    {formatEuro(Math.round(computation.loyerMIPMin / parseFloat(surface)))} €/m²{" "}
                    {t("estimationPage.to")}{" "}
                    {formatEuro(Math.round(computation.loyerMIPMax / parseFloat(surface)))} €/m² —{" "}
                    {t("estimationPage.exclCharges")}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">
                  <div
                    className="p-5 bg-blanc/5 border border-blanc/10"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.15em] text-blanc/40 mb-2">
                      {t("estimationPage.parisEncadrement")}
                    </div>
                    <div className="font-serif text-2xl text-blanc">
                      {formatEuro(computation.loyerMajore)} €
                    </div>
                    <div className="text-blanc/40 text-xs mt-1">
                      {computation.pricePerM2} €/m² {t("estimationPage.perM2Raised")}
                    </div>
                  </div>
                  <div
                    className="p-5 bg-gold/10 border border-gold/30"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                      {t("estimationPage.mipBonus")}
                    </div>
                    <div className="font-serif text-2xl text-gold">
                      + {formatEuro(computation.bonusMin)} € à + {formatEuro(computation.bonusMax)} €
                    </div>
                    <div className="text-blanc/40 text-xs mt-1">
                      {t("estimationPage.mipBonusNote")}
                    </div>
                  </div>
                </div>

                <div
                  className="p-5 bg-blanc/5 text-sm text-blanc/70 leading-relaxed mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-blanc font-medium mb-1">{t("estimationPage.andMore")}</div>
                  {t("estimationPage.rentExpressed")} <strong className="text-gold">{t("estimationPage.exclChargesUtilities")}</strong>{t("estimationPage.rentDetail")}{" "}
                  <strong>{t("estimationPage.noManagementFees")}</strong>{t("estimationPage.rentDetail2")}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/proposer-mon-appartement"
                    className="flex-1 text-center py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all"
                    style={{ borderRadius: 10 }}
                  >
                    {t("estimationPage.entrustProperty")}
                  </Link>
                  <Link
                    href="/contact"
                    className="flex-1 text-center py-4 border border-blanc/30 text-blanc font-medium tracking-wider uppercase text-sm hover:border-gold hover:text-gold transition-all"
                    style={{ borderRadius: 10 }}
                  >
                    {t("estimationPage.speakToAdvisor")}
                  </Link>
                </div>

                <p className="mt-8 text-xs text-blanc/40 italic">
                  {t("estimationPage.resultDisclaimer")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

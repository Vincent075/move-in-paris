"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import rentTable from "@/data/encadrement/rent-table.json";

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

export default function EstimationForm() {
  const [step, setStep] = useState<Step>("property");
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

  async function handleSubmitContact(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!consent) {
      setErrorMsg("Merci de valider le consentement RGPD.");
      return;
    }
    setSubmitting(true);
    try {
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
      setStep("result");
    } catch {
      setErrorMsg("Erreur — réessayez dans un instant.");
    }
    setSubmitting(false);
  }

  return (
    <section className="py-16 md:py-20 bg-blanc">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        {/* Progress dots */}
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

        <AnimatePresence mode="wait">
          {/* STEP 1 — Property info */}
          {step === "property" && (
            <motion.div
              key="property"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-blanc-chaud p-8 md:p-12"
              style={{ borderRadius: 10 }}
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                Étape 1 / 3
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-noir mt-2 mb-8">
                Parlez-nous de votre bien
              </h2>

              <div className="space-y-5">
                <div ref={wrapperRef} className="relative">
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    Adresse du bien *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setSuggestOpen(true);
                    }}
                    placeholder="Commencez à taper : 12 rue Pergolèse…"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  />
                  {suggestOpen && (suggestLoading || suggestions.length > 0) && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 bg-blanc border border-gris-clair/60 shadow-xl shadow-noir-deep/10 z-20 max-h-72 overflow-y-auto"
                      style={{ borderRadius: 10 }}
                    >
                      {suggestLoading && suggestions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gris italic">Recherche…</div>
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
                      <span className="text-gris italic">Identification du quartier…</span>
                    )}
                    {!resolving && quartier && (
                      <span className="text-gold">
                        ✓ Quartier détecté : <strong>{quartier.nom}</strong> — Paris {postcode}
                      </span>
                    )}
                    {!resolving && !quartier && fallbackCity && (
                      <span className="text-gold">
                        ✓ Zone : <strong>{fallbackCity}</strong>
                      </span>
                    )}
                    {!resolving && !quartier && !fallbackCity && address.length > 3 && !suggestOpen && (
                      <span className="text-gris italic">
                        Sélectionnez une suggestion ci-dessus pour détecter automatiquement le quartier.
                      </span>
                    )}
                    {!resolving && !quartier && !fallbackCity && !address && (
                      <span className="text-gris italic">
                        Sélectionnez une suggestion : le quartier se remplit automatiquement.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      Surface (m²) *
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
                      Nombre de pièces *
                    </label>
                    <select
                      required
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value as Pieces | "")}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="">Sélectionnez</option>
                      <option value="1">Studio / 1 pièce</option>
                      <option value="2">2 pièces</option>
                      <option value="3">3 pièces</option>
                      <option value="4">4 pièces et plus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    Époque de construction *
                  </label>
                  <select
                    value={epoch}
                    onChange={(e) => setEpoch(e.target.value as Epoque)}
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  >
                    {Object.entries(EPOQUE_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep("contact")}
                className={`w-full mt-8 py-4 font-medium tracking-wider uppercase text-sm transition-all ${
                  canContinue
                    ? "bg-gold text-noir-deep hover:bg-gold-light"
                    : "bg-gris-clair text-gris cursor-not-allowed"
                }`}
                style={{ borderRadius: 10 }}
              >
                Obtenir mon estimation →
              </button>

              <p className="text-xs text-gris mt-4 italic">
                Calcul basé sur les barèmes officiels de l&apos;encadrement des loyers parisien 2025
                (DRIHL, meublé) et sur les conditions corporate Move in Paris. Un conseiller validera
                ces chiffres après visite.
              </p>
            </motion.div>
          )}

          {/* STEP 2 — Contact */}
          {step === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-blanc-chaud p-8 md:p-12"
              style={{ borderRadius: 10 }}
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                Étape 2 / 3 — Quasiment fini !
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-noir mt-2 mb-2">
                Votre estimation est prête
              </h2>
              <p className="text-gris text-sm mb-8">
                Laissez-nous vos coordonnées pour découvrir le loyer auquel nous pouvons louer votre
                appartement à nos clients corporate — et planifier une visite pour finaliser l&apos;estimation.
              </p>

              {/* Recap */}
              <div
                className="mb-6 p-5 bg-blanc border border-gris-clair/50 text-sm"
                style={{ borderRadius: 10 }}
              >
                <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                  Votre bien
                </div>
                <div className="grid sm:grid-cols-2 gap-y-1 text-noir">
                  <div>
                    <span className="text-gris">Quartier :</span> {zoneLabel || "—"}
                  </div>
                  <div>
                    <span className="text-gris">Surface :</span> {surface} m²
                  </div>
                  <div>
                    <span className="text-gris">Pièces :</span>{" "}
                    {rooms === "4"
                      ? "4 pièces et plus"
                      : rooms === "1"
                      ? "Studio / 1 pièce"
                      : rooms
                      ? `${rooms} pièces`
                      : "—"}
                  </div>
                  <div>
                    <span className="text-gris">Époque :</span> {EPOQUE_LABELS[epoch]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("property")}
                  className="mt-3 text-xs text-gold hover:text-gold-dark underline"
                >
                  Modifier
                </button>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      Civilité
                    </label>
                    <select
                      value={civilite}
                      onChange={(e) => setCivilite(e.target.value)}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="">—</option>
                      <option value="M.">Monsieur</option>
                      <option value="Mme">Madame</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                      Prénom *
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
                      Nom *
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
                      Email *
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
                      Téléphone *
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
                  <span>
                    J&apos;accepte d&apos;être contacté par Move in Paris au sujet de mon estimation
                    et j&apos;accepte la politique de confidentialité (RGPD). Vos données ne sont
                    transmises à aucun tiers.
                  </span>
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
                  {submitting ? "Envoi…" : "Découvrir mon estimation →"}
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
                  Votre estimation Move in Paris
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-blanc mt-3 mb-2">
                  Merci {prenom} !
                </h2>
                <p className="text-blanc/60 text-sm mb-10">
                  Voici le loyer auquel nous pouvons louer votre appartement à nos clients corporate
                  ({surface} m², {zoneLabel}).
                </p>

                <div
                  className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 p-8 mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                    Fourchette de loyer mensuel (hors charges)
                  </div>
                  <div className="font-serif text-4xl md:text-5xl text-gold font-bold leading-tight">
                    {formatEuro(computation.loyerMIPMin)} €
                    <span className="text-blanc/60 mx-3">–</span>
                    {formatEuro(computation.loyerMIPMax)} €
                  </div>
                  <div className="text-blanc/70 text-sm mt-3">
                    soit environ{" "}
                    {formatEuro(Math.round(computation.loyerMIPMin / parseFloat(surface)))} €/m²
                    à{" "}
                    {formatEuro(Math.round(computation.loyerMIPMax / parseFloat(surface)))} €/m² —
                    hors charges et utilities
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">
                  <div
                    className="p-5 bg-blanc/5 border border-blanc/10"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.15em] text-blanc/40 mb-2">
                      Encadrement Paris (loyer majoré)
                    </div>
                    <div className="font-serif text-2xl text-blanc">
                      {formatEuro(computation.loyerMajore)} €
                    </div>
                    <div className="text-blanc/40 text-xs mt-1">
                      {computation.pricePerM2} €/m² majoré
                    </div>
                  </div>
                  <div
                    className="p-5 bg-gold/10 border border-gold/30"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                      Marge corporate Move in Paris
                    </div>
                    <div className="font-serif text-2xl text-gold">
                      + {formatEuro(computation.bonusMin)} € à + {formatEuro(computation.bonusMax)} €
                    </div>
                    <div className="text-blanc/40 text-xs mt-1">
                      soit +25 % à +36 % grâce à notre clientèle corporate
                    </div>
                  </div>
                </div>

                <div
                  className="p-5 bg-blanc/5 text-sm text-blanc/70 leading-relaxed mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-blanc font-medium mb-1">Et ce n&apos;est pas tout :</div>
                  Ce loyer est exprimé <strong className="text-gold">hors charges et hors utilities</strong>,
                  comme le loyer de l&apos;encadrement. Service Move in Paris 100 % gratuit —{" "}
                  <strong>aucun frais de gestion</strong>, aucune commission. Les charges et utilities
                  (électricité, gaz, internet, charges d&apos;immeuble, entretien chaudière, TEOM) sont
                  refacturées en sus à la charge du locataire corporate.
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/proposer-mon-appartement"
                    className="flex-1 text-center py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all"
                    style={{ borderRadius: 10 }}
                  >
                    Confier mon bien à Move in Paris →
                  </Link>
                  <Link
                    href="/contact"
                    className="flex-1 text-center py-4 border border-blanc/30 text-blanc font-medium tracking-wider uppercase text-sm hover:border-gold hover:text-gold transition-all"
                    style={{ borderRadius: 10 }}
                  >
                    Parler à un conseiller
                  </Link>
                </div>

                <p className="mt-8 text-xs text-blanc/40 italic">
                  Estimation indicative basée sur les barèmes officiels de l&apos;encadrement des
                  loyers parisien 2025 (DRIHL, meublé). Un conseiller Move in Paris vous contactera
                  sous 24h pour valider ces chiffres après visite du bien. Les valeurs peuvent varier
                  selon l&apos;état, la vue, l&apos;étage et les équipements.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

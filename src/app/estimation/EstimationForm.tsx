"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/**
 * Approximation loyer majoré MEUBLÉ €/m² — Paris & proche banlieue ouest 2025.
 * Valeurs médianes par zone et par catégorie de pièces.
 * Basé sur les barèmes DRIHL Île-de-France (arrondis au plus favorable).
 * Pour un calcul officiel : referenceloyer.drihl.ile-de-france.developpement-durable.gouv.fr
 */
const LOYER_MAJORE: Record<string, { [k in "1" | "2" | "3" | "4+"]: number }> = {
  "Paris 1er":   { "1": 42, "2": 38, "3": 35, "4+": 32 },
  "Paris 2e":    { "1": 42, "2": 38, "3": 35, "4+": 32 },
  "Paris 3e":    { "1": 40, "2": 36, "3": 33, "4+": 30 },
  "Paris 4e":    { "1": 42, "2": 38, "3": 35, "4+": 32 },
  "Paris 5e":    { "1": 40, "2": 36, "3": 33, "4+": 30 },
  "Paris 6e":    { "1": 41, "2": 37, "3": 34, "4+": 31 },
  "Paris 7e":    { "1": 41, "2": 37, "3": 34, "4+": 31 },
  "Paris 8e":    { "1": 40, "2": 36, "3": 33, "4+": 30 },
  "Paris 9e":    { "1": 38, "2": 34, "3": 31, "4+": 28 },
  "Paris 10e":   { "1": 35, "2": 31, "3": 28, "4+": 25 },
  "Paris 11e":   { "1": 35, "2": 31, "3": 28, "4+": 25 },
  "Paris 12e":   { "1": 33, "2": 29, "3": 26, "4+": 24 },
  "Paris 13e":   { "1": 31, "2": 27, "3": 24, "4+": 22 },
  "Paris 14e":   { "1": 33, "2": 29, "3": 26, "4+": 24 },
  "Paris 15e":   { "1": 33, "2": 29, "3": 26, "4+": 24 },
  "Paris 16e":   { "1": 38, "2": 34, "3": 31, "4+": 28 },
  "Paris 17e":   { "1": 36, "2": 32, "3": 29, "4+": 26 },
  "Paris 18e":   { "1": 33, "2": 29, "3": 26, "4+": 24 },
  "Paris 19e":   { "1": 30, "2": 26, "3": 23, "4+": 21 },
  "Paris 20e":   { "1": 30, "2": 26, "3": 23, "4+": 21 },
  "Neuilly-sur-Seine": { "1": 35, "2": 31, "3": 28, "4+": 25 },
  "Levallois-Perret":  { "1": 33, "2": 29, "3": 26, "4+": 24 },
  "Boulogne-Billancourt": { "1": 32, "2": 28, "3": 25, "4+": 23 },
};

const EPOCH_MULTIPLIER: Record<string, number> = {
  "avant-1946": 1.05,
  "1946-1970": 0.95,
  "1971-1990": 0.98,
  "apres-1990": 1.0,
};

const MOVE_IN_PARIS_PREMIUM = 1.35; // +35 % sur le loyer majoré

function formatEuro(value: number) {
  return value.toLocaleString("fr-FR", {
    maximumFractionDigits: 0,
  });
}

type Step = "property" | "contact" | "result";

export default function EstimationForm() {
  const [step, setStep] = useState<Step>("property");
  const [submitting, setSubmitting] = useState(false);

  // Property fields
  const [zone, setZone] = useState<string>("");
  const [rooms, setRooms] = useState<"1" | "2" | "3" | "4+" | "">("");
  const [surface, setSurface] = useState("");
  const [epoch, setEpoch] = useState<string>("apres-1990");
  const [address, setAddress] = useState("");

  // Contact fields
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const computation = useMemo(() => {
    if (!zone || !rooms || !surface) return null;
    const s = parseFloat(surface);
    if (!s || s <= 0) return null;
    const table = LOYER_MAJORE[zone];
    if (!table) return null;
    const basePerM2 = table[rooms] * (EPOCH_MULTIPLIER[epoch] ?? 1);
    const loyerMajore = Math.round(basePerM2 * s);
    const loyerMoveInParis = Math.round(loyerMajore * MOVE_IN_PARIS_PREMIUM);
    return {
      pricePerM2: Math.round(basePerM2),
      loyerMajore,
      loyerMoveInParis,
      bonus: loyerMoveInParis - loyerMajore,
    };
  }, [zone, rooms, surface, epoch]);

  const canContinue = !!zone && !!rooms && !!surface && !!computation;

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
          zone,
          pieces: rooms,
          surface,
          epoch,
          loyerMajore: computation?.loyerMajore,
          loyerMoveInParis: computation?.loyerMoveInParis,
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
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    Adresse (ou ville) — optionnel
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="12 rue Pergolèse, Paris 16e"
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    Zone / arrondissement *
                  </label>
                  <select
                    required
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="">Sélectionnez votre zone</option>
                    {Object.keys(LOYER_MAJORE).map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
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
                      onChange={(e) => setRooms(e.target.value as "1" | "2" | "3" | "4+" | "")}
                      className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                    >
                      <option value="">Sélectionnez</option>
                      <option value="1">Studio / 1 pièce</option>
                      <option value="2">2 pièces</option>
                      <option value="3">3 pièces</option>
                      <option value="4+">4 pièces et plus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">
                    Époque de construction
                  </label>
                  <select
                    value={epoch}
                    onChange={(e) => setEpoch(e.target.value)}
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="avant-1946">Avant 1946</option>
                    <option value="1946-1970">1946 – 1970</option>
                    <option value="1971-1990">1971 – 1990</option>
                    <option value="apres-1990">Après 1990</option>
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
                Estimation indicative basée sur les barèmes DRIHL Paris 2025 et la marge corporate Move in Paris.
                Un conseiller validera ces chiffres après visite du bien.
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
                Laissez-nous vos coordonnées pour découvrir le loyer que Move in Paris peut vous garantir —
                et planifier une visite pour finaliser l&apos;estimation.
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
                    <span className="text-gris">Zone :</span> {zone || "—"}
                  </div>
                  <div>
                    <span className="text-gris">Surface :</span> {surface} m²
                  </div>
                  <div>
                    <span className="text-gris">Pièces :</span>{" "}
                    {rooms === "4+" ? "4 pièces et plus" : rooms === "1" ? "Studio / 1 pièce" : `${rooms} pièces`}
                  </div>
                  <div>
                    <span className="text-gris">Époque :</span>{" "}
                    {epoch === "avant-1946" ? "Avant 1946" : epoch === "1946-1970" ? "1946-1970" : epoch === "1971-1990" ? "1971-1990" : "Après 1990"}
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
                    J&apos;accepte d&apos;être contacté par Move in Paris au sujet de mon estimation et j&apos;accepte la
                    politique de confidentialité (RGPD). Vos données ne sont transmises à aucun tiers.
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
                  Voici ce que Move in Paris peut vous garantir pour votre bien ({surface} m², {zone}).
                </p>

                <div
                  className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 p-8 mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
                    Loyer mensuel charges comprises
                  </div>
                  <div className="font-serif text-5xl md:text-6xl text-gold font-bold">
                    {formatEuro(computation.loyerMoveInParis)} €
                  </div>
                  <div className="text-blanc/70 text-sm mt-2">
                    soit environ {formatEuro(Math.round(computation.loyerMoveInParis / parseFloat(surface)))} €/m² — tout compris
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
                      {formatEuro(computation.pricePerM2)} €/m² majoré
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
                      + {formatEuro(computation.bonus)} €
                    </div>
                    <div className="text-blanc/40 text-xs mt-1">
                      soit +35 % grâce à notre clientèle corporate
                    </div>
                  </div>
                </div>

                <div
                  className="p-5 bg-blanc/5 text-sm text-blanc/70 leading-relaxed mb-8"
                  style={{ borderRadius: 10 }}
                >
                  <div className="text-blanc font-medium mb-1">Et ce n&apos;est pas tout :</div>
                  Ce loyer est <strong className="text-gold">entièrement net pour vous</strong>. Service Move in Paris
                  100 % gratuit — <strong>aucun frais de gestion</strong>, aucune commission. Le loyer inclut également
                  l&apos;ensemble des charges : électricité, gaz, internet, charges d&apos;immeuble, entretien chaudière, TEOM.
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
                  Estimation indicative basée sur les barèmes Paris 2025. Un conseiller Move in Paris vous contactera
                  sous 24h pour valider ces chiffres après visite du bien. Les valeurs peuvent varier selon l&apos;état,
                  la vue, l&apos;étage et les équipements.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

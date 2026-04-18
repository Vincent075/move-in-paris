"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePickField, useT } from "@/i18n/LocaleProvider";

// Official RATP metro line colors
const METRO_LINE_COLORS: Record<string, { bg: string; text: string }> = {
  "1":      { bg: "#FFCD00", text: "#000000" },
  "2":      { bg: "#003CA6", text: "#FFFFFF" },
  "3":      { bg: "#837902", text: "#FFFFFF" },
  "3BIS":   { bg: "#6EC4E8", text: "#000000" },
  "4":      { bg: "#CF009E", text: "#FFFFFF" },
  "5":      { bg: "#FF7E2E", text: "#000000" },
  "6":      { bg: "#6ECA97", text: "#000000" },
  "7":      { bg: "#FA9ABA", text: "#000000" },
  "7BIS":   { bg: "#6ECA97", text: "#000000" },
  "8":      { bg: "#E19BDF", text: "#000000" },
  "9":      { bg: "#B6BD00", text: "#000000" },
  "10":     { bg: "#C9910D", text: "#FFFFFF" },
  "11":     { bg: "#704B1C", text: "#FFFFFF" },
  "12":     { bg: "#007852", text: "#FFFFFF" },
  "13":     { bg: "#6EC4E8", text: "#000000" },
  "14":     { bg: "#62259D", text: "#FFFFFF" },
  "RER A":  { bg: "#E3051C", text: "#FFFFFF" },
  "RER B":  { bg: "#477AB4", text: "#FFFFFF" },
};

/**
 * Parse metro line numbers from a station name like "George V (ligne 9)"
 * or "Charles de Gaulle Étoile (RER A, lignes 1, 2, 6)"
 */
function parseMetroLinesFromName(name: string): string[] {
  // Match content inside parentheses
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (!parenMatch) return [];

  const inner = parenMatch[1];
  // Split by comma or semicolon
  const parts = inner.split(/[,;]+/).map((p) => p.trim());
  const lines: string[] = [];

  for (const part of parts) {
    // Remove "ligne", "lignes", "RER", "line" prefixes
    const cleaned = part.replace(/\b(lignes?|lines?)\b/gi, "").trim();
    // RER lines: "RER A", "RER B"
    const rerMatch = cleaned.match(/\bRER\s*([AB])\b/i);
    if (rerMatch) {
      lines.push(`RER ${rerMatch[1].toUpperCase()}`);
      continue;
    }
    // Numeric lines: 1-14, 3bis, 7bis
    const numMatch = cleaned.match(/\b(1[0-4]|[1-9]|3[Bb][Ii][Ss]|7[Bb][Ii][Ss])\b/i);
    if (numMatch) {
      lines.push(numMatch[1].toUpperCase());
    }
  }

  return lines;
}

function MetroLineBadge({ line }: { line: string }) {
  const colors = METRO_LINE_COLORS[line] || { bg: "#6B6B6B", text: "#FFFFFF" };
  // Display label: shorten "RER A" → "A" inside the badge, but show "RER A" in title
  const label = line.startsWith("RER ") ? line.slice(4) : line.toLowerCase().replace("bis", "ᵇ");
  return (
    <span
      title={`Ligne ${line}`}
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold leading-none flex-shrink-0"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}

function VisitForm({ title }: { title: string }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      formType: "visite",
      appartement: title,
      nom: (form.elements.namedItem("nom") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      telephone: (form.elements.namedItem("telephone") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };
    try {
      await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setSent(true);
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (sent) {
    return (
      <>
        <h3 className="font-serif text-xl text-noir mb-4">{t("apartment.requestSent")}</h3>
        <p className="text-gris text-sm font-light">{t("apartment.requestSentDetail")}</p>
        <button onClick={() => setSent(false)} className="mt-4 text-gold text-sm">{t("apartment.newRequest")}</button>
      </>
    );
  }

  return (
    <>
      <h3 className="font-serif text-xl text-noir mb-6">{t("apartment.requestVisit")}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="nom" type="text" required placeholder={t("apartment.formName")}
          className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
        <input name="email" type="email" required placeholder={t("apartment.formEmail")}
          className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
        <input name="telephone" type="tel" placeholder={t("apartment.formPhone")}
          className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
        <textarea name="message" rows={3}
          defaultValue={t("apartment.defaultMessage").replace("{title}", title)}
          className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors resize-none" />
        <button type="submit" disabled={loading}
          className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all duration-300 ${loading ? "bg-gris text-blanc" : "bg-gold text-noir-deep hover:bg-gold-light"}`}>
          {loading ? t("apartment.sending") : t("apartment.sendRequest")}
        </button>
      </form>
    </>
  );
}

interface ApartmentProps {
  apartment: {
    title: string;
    title_en?: string;
    address: string;
    address_en?: string;
    district: string;
    surface: number;
    rooms: number;
    bedrooms: number;
    bathrooms: number;
    floor: string;
    floor_en?: string;
    status: string;
    description: string;
    description_en?: string;
    features: string[];
    features_en?: string[];
    images: string[];
    nearby: { type: string; name: string; distance: string; lines?: string[] }[];
  };
}

export default function ApartmentDetail({ apartment }: ApartmentProps) {
  const t = useT();
  const pick = usePickField();
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const apt = apartment;
  const title = pick<string>(apt, "title");
  const address = pick<string>(apt, "address");
  const floor = pick<string>(apt, "floor");
  const description = pick<string>(apt, "description");
  const features = pick<string[]>(apt, "features", []);

  return (
    <>
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-noir-deep/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-blanc/10 text-blanc text-xl flex items-center justify-center hover:bg-blanc/20 transition-colors z-10"
            >
              ✕
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p - 1 + apt.images.length) % apt.images.length); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-blanc/10 text-blanc text-2xl flex items-center justify-center hover:bg-gold transition-colors z-10"
            >
              &#8249;
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p + 1) % apt.images.length); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-blanc/10 text-blanc text-2xl flex items-center justify-center hover:bg-gold transition-colors z-10"
            >
              &#8250;
            </button>
            <motion.div
              key={currentImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] relative"
            >
              <div
                className="w-[85vw] h-[75vh] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${apt.images[currentImage]}')` }}
              />
            </motion.div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-blanc/60 text-sm">
              {currentImage + 1} / {apt.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <div className="pt-24 pb-2 bg-blanc-chaud">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-2 text-xs text-gris">
            <Link href="/" className="hover:text-gold transition-colors">{t("apartment.breadcrumbHome")}</Link>
            <span>/</span>
            <Link href="/nos-appartements" className="hover:text-gold transition-colors">{t("apartment.breadcrumbApartments")}</Link>
            <span>/</span>
            <span className="text-gold">{title}</span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <section className="bg-blanc-chaud pb-4">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-[1fr_300px] gap-4">
            {/* Main image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gris-clair cursor-pointer" onClick={() => setLightboxOpen(true)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${apt.images[currentImage]}')` }}
                />
              </AnimatePresence>
              {/* Arrows */}
              <button
                onClick={() => setCurrentImage((p) => (p - 1 + apt.images.length) % apt.images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-noir-deep/60 text-blanc flex items-center justify-center hover:bg-gold transition-colors"
              >
                &#8249;
              </button>
              <button
                onClick={() => setCurrentImage((p) => (p + 1) % apt.images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-noir-deep/60 text-blanc flex items-center justify-center hover:bg-gold transition-colors"
              >
                &#8250;
              </button>
              {/* Counter */}
              <div className="absolute bottom-4 right-4 bg-noir-deep/70 text-blanc text-xs px-3 py-1">
                {currentImage + 1} / {apt.images.length}
              </div>
            </div>

            {/* Thumbnails — bounded to main image height on desktop, scrollable if overflow */}
            <div className="lg:relative">
              <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-1 thumbs-scroll">
                {apt.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`aspect-square bg-cover bg-center transition-all duration-300 ${
                      currentImage === i
                        ? "ring-2 ring-gold opacity-100"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundImage: `url('${img}')` }}
                  />
                ))}
              </div>
            </div>
            <style>{`
              .thumbs-scroll::-webkit-scrollbar { width: 4px; }
              .thumbs-scroll::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.4); border-radius: 2px; }
              .thumbs-scroll::-webkit-scrollbar-track { background: transparent; }
              .thumbs-scroll { scrollbar-width: thin; scrollbar-color: rgba(197,160,89,0.4) transparent; }
            `}</style>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12">
            {/* Left - Details */}
            <div>
              {/* Title & address */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="font-serif text-4xl md:text-5xl text-noir mb-2">
                  <span className="block text-gold uppercase text-xs tracking-[0.2em] font-sans font-medium mb-3">
                    {t("apartment.h1Eyebrow")} {apt.district}
                  </span>
                  {title}
                </h1>
                <p className="text-gris text-lg font-light mb-8">{address}</p>
              </motion.div>

              {/* Key stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-blanc-chaud border border-gris-clair/50 mb-10 [&>div+div]:relative sm:[&>div+div]:before:content-[''] sm:[&>div+div]:before:absolute sm:[&>div+div]:before:left-0 sm:[&>div+div]:before:top-1/2 sm:[&>div+div]:before:-translate-y-1/2 sm:[&>div+div]:before:h-10 sm:[&>div+div]:before:w-px sm:[&>div+div]:before:bg-gris-clair"
              >
                <div className="text-center">
                  <div className="text-2xl font-serif text-gold font-bold">{apt.surface} {t("common.surfaceUnit")}</div>
                  <div className="text-xs text-gris uppercase tracking-wider mt-1">{t("apartment.surface")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-serif text-gold font-bold">{apt.rooms}</div>
                  <div className="text-xs text-gris uppercase tracking-wider mt-1">{t("apartment.rooms")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-serif text-gold font-bold">{apt.bedrooms}</div>
                  <div className="text-xs text-gris uppercase tracking-wider mt-1">{apt.bedrooms > 1 ? t("apartment.bedrooms") : t("apartment.bedroom")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-serif text-gold font-bold">{apt.bathrooms}</div>
                  <div className="text-xs text-gris uppercase tracking-wider mt-1">{apt.bathrooms > 1 ? t("apartment.bathrooms") : t("apartment.bathroom")}</div>
                </div>
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-10"
              >
                <h2 className="font-serif text-2xl text-noir mb-4">{t("apartment.description")}</h2>
                <div className="h-px w-12 bg-gold mb-6" />
                <p className="text-gris font-light leading-relaxed">{description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-noir">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  {floor}
                </div>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-10"
              >
                <h2 className="font-serif text-2xl text-noir mb-4">{t("apartment.equipment")}</h2>
                <div className="h-px w-12 bg-gold mb-6" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-3 py-2">
                      <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-gris text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Map */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-10"
              >
                <h2 className="font-serif text-2xl text-noir mb-4">{t("apartment.location")}</h2>
                <div className="h-px w-12 bg-gold mb-6" />
                <div className="aspect-[16/9] bg-gris-clair overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(address + ", France")}&zoom=15`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={t("apartment.mapTitle").replace("{title}", apt.title)}
                  />
                </div>
              </motion.div>

              {/* Nearby */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="font-serif text-2xl text-noir mb-4">{t("apartment.nearby")}</h2>
                <div className="h-px w-12 bg-gold mb-6" />
                <div className="space-y-3">
                  {apt.nearby.map((n, i) => {
                    // Determine lines to show: prefer explicit `lines` field, otherwise parse from name
                    const isMetroType = n.type === "Métro" || n.type === "RER" || n.type === "RER / Métro";
                    const lines: string[] = isMetroType
                      ? (n.lines && n.lines.length > 0 ? n.lines : parseMetroLinesFromName(n.name))
                      : [];

                    return (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-gris-clair/50 last:border-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="px-2 py-1 bg-gold/10 text-gold text-[10px] uppercase tracking-wider font-medium flex-shrink-0">
                            {n.type}
                          </span>
                          <span className="text-noir text-sm">{n.name}</span>
                          {lines.length > 0 && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              {lines.map((line) => (
                                <MetroLineBadge key={line} line={line} />
                              ))}
                            </span>
                          )}
                        </div>
                        <span className="text-gris text-sm flex-shrink-0 ml-3">{n.distance}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Right - Contact sidebar */}
            <div>
              <div className="sticky top-28">
                {/* Price card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-noir-deep p-8 mb-6"
                >
                  <div className="text-center mb-6">
                    <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("apartment.monthlyRent")}</span>
                    <div className="font-serif text-3xl text-blanc mt-2">{t("common.onRequest")}</div>
                    <p className="text-blanc/40 text-xs mt-2">{t("common.chargesIncluded")}</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-blanc/60">
                      <span>{t("apartment.surface")}</span>
                      <span className="text-blanc">{apt.surface} {t("common.surfaceUnit")}</span>
                    </div>
                    <div className="flex justify-between text-blanc/60">
                      <span>{t("apartment.type")}</span>
                      <span className="text-blanc">{apt.rooms} {(apt.rooms > 1 ? t("apartment.rooms") : t("apartment.room")).toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between text-blanc/60">
                      <span>{t("apartment.floor")}</span>
                      <span className="text-blanc">{floor}</span>
                    </div>
                    <div className="flex justify-between text-blanc/60">
                      <span>{t("apartment.lease")}</span>
                      <span className="text-blanc">{t("apartment.leaseValue")}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Contact form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-blanc-chaud border border-gris-clair/50 p-8"
                >
                  <VisitForm title={title} />
                  <div className="mt-6 pt-6 border-t border-gris-clair/50 text-center">
                    <p className="text-xs text-gris mb-2">{t("apartment.orCall")}</p>
                    <a href="tel:+33145200603" className="text-gold font-serif text-lg hover:text-gold-dark transition-colors">
                      +33 1 45 20 06 03
                    </a>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import apartmentsDataRaw from "@/data/apartments.json";
import type { ApartmentRecord } from "@/data/apartment-types";
import { usePickField, useT } from "@/i18n/LocaleProvider";
import Dropdown from "@/components/Dropdown";
import { resolveMetroLines } from "@/lib/metroLines";

const apartmentsData = apartmentsDataRaw as ApartmentRecord[];

function hasFeature(apt: ApartmentRecord, keyword: string): boolean {
  const needle = keyword.toLowerCase();
  if (apt.features?.some((f) => f.toLowerCase().includes(needle))) return true;
  if (apt.description?.toLowerCase().includes(needle)) return true;
  return false;
}

function getApartmentMetroLines(apt: ApartmentRecord): Set<string> {
  const out = new Set<string>();
  for (const n of apt.nearby || []) {
    if (n.type !== "Métro" && n.type !== "RER" && n.type !== "RER / Métro") continue;
    const lines = resolveMetroLines(n.name, n.lines);
    for (const line of lines) out.add(line);
  }
  return out;
}

const ALL_METRO_LINES = [
  "1", "2", "3", "3BIS", "4", "5", "6", "7", "7BIS", "8", "9", "10", "11", "12", "13", "14",
  "RER A", "RER B", "RER C", "RER D", "RER E",
];

export default function ApartmentsList() {
  const t = useT();
  const pick = usePickField();
  const resultsRef = useRef<HTMLDivElement>(null);
  const ALL = t("searchBar.allCities");
  const ALL_TYPES = t("searchBar.allTypes");
  const locations = [
    ALL,
    "Paris 1er - 4e",
    "Paris 5e - 7e",
    "Paris 8e",
    "Paris 9e - 11e",
    "Paris 12e - 14e",
    "Paris 15e - 16e",
    "Paris 17e",
    "Paris 18e - 20e",
    "Neuilly-sur-Seine",
    "Levallois-Perret",
    "Boulogne",
  ];
  const typesList = [
    { value: "all", label: ALL_TYPES },
    { value: "studio", label: t("searchBar.studio") },
    { value: "2", label: t("searchBar.twoRooms") },
    { value: "3", label: t("searchBar.threeRooms") },
    { value: "4+", label: t("searchBar.fourRoomsPlus") },
  ];
  const bedroomsList = [
    { value: "all", label: t("apartmentsPage.allBedrooms") },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3+", label: "3+" },
  ];
  const ynList = [
    { value: "no", label: t("apartmentsPage.no") },
    { value: "yes", label: t("apartmentsPage.yes") },
  ];
  const metroList = [
    { value: "all", label: t("apartmentsPage.no") },
    ...ALL_METRO_LINES.map((l) => ({
      value: l,
      label: l.startsWith("RER ") ? l : `M${l.toLowerCase().replace("bis", "ᵇ")}`,
    })),
  ];

  const [selectedLocation, setSelectedLocation] = useState(ALL);
  const [selectedType, setSelectedType] = useState("all");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [surfaceMax, setSurfaceMax] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bedrooms, setBedrooms] = useState("all");
  const [elevator, setElevator] = useState("no");
  const [concierge, setConcierge] = useState("no");
  const [metroLine, setMetroLine] = useState("all");

  const filtered = apartmentsData.filter((apt) => {
    if (selectedLocation !== ALL && apt.district !== selectedLocation) {
      // also accept when location is a range that includes the district
      if (!selectedLocation.includes(apt.district)) return false;
    }
    if (selectedType !== "all") {
      if (selectedType === "studio" && apt.rooms !== 1) return false;
      if (selectedType === "2" && apt.rooms !== 2) return false;
      if (selectedType === "3" && apt.rooms !== 3) return false;
      if (selectedType === "4+" && apt.rooms < 4) return false;
    }
    if (surfaceMin && apt.surface < parseInt(surfaceMin)) return false;
    if (surfaceMax && apt.surface > parseInt(surfaceMax)) return false;
    if (bedrooms !== "all") {
      if (bedrooms === "3+" && apt.bedrooms < 3) return false;
      if (bedrooms !== "3+" && apt.bedrooms !== parseInt(bedrooms)) return false;
    }
    if (elevator === "yes" && !hasFeature(apt, "ascenseur")) return false;
    if (concierge === "yes" && !hasFeature(apt, "gardien")) return false;
    if (metroLine !== "all") {
      const lines = getApartmentMetroLines(apt);
      if (!lines.has(metroLine)) return false;
    }
    return true;
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleAdvanced() {
    setAdvancedOpen((v) => !v);
  }

  return (
    <section className="pb-16 bg-blanc">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Search bar — same visual language as home */}
        <form
          onSubmit={handleSearch}
          className="mb-12 -mt-16 lg:-mt-24 relative z-20 bg-white shadow-2xl shadow-noir-deep/15 border border-gris-clair/30"
        >
          {/* Row 1: primary filters + search */}
          <div className="p-2.5 flex flex-col md:flex-row items-stretch">
            <Dropdown
              label={t("searchBar.location")}
              value={selectedLocation}
              options={locations}
              onChange={setSelectedLocation}
            />
            <Dropdown
              label={t("searchBar.type")}
              value={selectedType}
              options={typesList}
              onChange={setSelectedType}
            />
            <div className="flex-1 border-b md:border-b-0 md:border-r border-gris-clair/20 px-5 py-3.5">
              <label htmlFor="surface-min" className="block text-[10px] text-gold-dark uppercase tracking-[0.15em] font-semibold mb-1.5">
                {t("searchBar.surfaceMin")} ({t("common.surfaceUnit")})
              </label>
              <input
                id="surface-min"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value.replace(/\D/g, ""))}
                placeholder="25"
                className="w-full bg-transparent text-noir text-base sm:text-sm font-medium focus:outline-none border-0 p-0 placeholder:text-gris/40"
              />
            </div>
            <div className="flex-1 border-b md:border-b-0 md:border-r border-gris-clair/20 px-5 py-3.5">
              <label htmlFor="surface-max" className="block text-[10px] text-gold-dark uppercase tracking-[0.15em] font-semibold mb-1.5">
                {t("searchBar.surfaceMax")} ({t("common.surfaceUnit")})
              </label>
              <input
                id="surface-max"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={surfaceMax}
                onChange={(e) => setSurfaceMax(e.target.value.replace(/\D/g, ""))}
                placeholder="150"
                className="w-full bg-transparent text-noir text-base sm:text-sm font-medium focus:outline-none border-0 p-0 placeholder:text-gris/40"
              />
            </div>
            <button
              type="submit"
              className="bg-gold-light hover:bg-gold text-noir-deep px-10 py-4 md:py-3 flex items-center justify-center gap-2.5 transition-all duration-300 font-semibold text-sm tracking-[0.15em] uppercase group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {t("searchBar.search")}
            </button>
          </div>

          {/* Advanced inline trigger */}
          <div className="border-t border-gris-clair/30">
            <button
              type="button"
              onClick={toggleAdvanced}
              aria-expanded={advancedOpen}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs text-gold-dark hover:text-gold hover:bg-blanc-chaud transition-colors uppercase tracking-[0.15em] font-semibold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <circle cx="9" cy="6" r="2" fill="var(--blanc)" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <circle cx="15" cy="12" r="2" fill="var(--blanc)" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <circle cx="7" cy="18" r="2" fill="var(--blanc)" />
              </svg>
              {advancedOpen ? t("apartmentsPage.advancedHide") : t("apartmentsPage.advanced")}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Advanced panel - integrated */}
          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-gris-clair/30 bg-blanc-chaud/40"
              >
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Dropdown
                    label={t("apartmentsPage.bedrooms")}
                    value={bedrooms}
                    options={bedroomsList}
                    onChange={setBedrooms}
                    flush={false}
                  />
                  <Dropdown
                    label={t("apartmentsPage.metroLine")}
                    value={metroLine}
                    options={metroList}
                    onChange={setMetroLine}
                    flush={false}
                  />
                  <Dropdown
                    label={t("apartmentsPage.elevator")}
                    value={elevator}
                    options={ynList}
                    onChange={setElevator}
                    flush={false}
                  />
                  <Dropdown
                    label={t("apartmentsPage.concierge")}
                    value={concierge}
                    options={ynList}
                    onChange={setConcierge}
                    flush={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div ref={resultsRef} />

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((apt, i) => (
            <motion.article
              key={apt.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group border border-gris-clair/50 hover:border-gold/30 transition-all duration-500 bg-blanc"
            >
              {/* Image */}
              <Link href={`/appartement/${apt.slug}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  {apt.images[0] && (
                    <Image
                      src={apt.images[0]}
                      alt={pick<string>(apt as unknown as Record<string, unknown>, "title")}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute bottom-4 right-4 bg-noir-deep/60 text-blanc text-xs px-2 py-1">
                    {apt.images.length} photos
                  </div>
                </div>
              </Link>

              {/* Content */}
              <div className="p-6">
                <Link href={`/appartement/${apt.slug}`}>
                  <h3 className="font-serif text-xl text-noir mb-1 group-hover:text-gold transition-colors">
                    {pick<string>(apt, "title")}
                  </h3>
                </Link>
                <p className="text-sm text-gris mb-4">{pick<string>(apt, "address")}</p>

                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-t border-b border-gris-clair/50 [&>div+div]:relative [&>div+div]:before:content-[''] [&>div+div]:before:absolute [&>div+div]:before:left-0 [&>div+div]:before:top-1/2 [&>div+div]:before:-translate-y-1/2 [&>div+div]:before:h-8 [&>div+div]:before:w-px [&>div+div]:before:bg-gris-clair">
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.surface} {t("common.surfaceUnit")}</div>
                    <div className="text-xs text-gris">{t("apartment.surface")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.rooms}</div>
                    <div className="text-xs text-gris">{t("apartment.rooms")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.bathrooms}</div>
                    <div className="text-xs text-gris">{t("apartment.sdb")}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {pick<string[]>(apt, "features", []).slice(0, 3).map((f) => (
                    <span key={f} className="px-2 py-1 text-[10px] uppercase tracking-wider border border-gris-clair text-gris">
                      {f}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gold font-serif text-lg">{t("common.onRequest")}</span>
                  <Link
                    href={`/appartement/${apt.slug}`}
                    className="text-xs uppercase tracking-wider text-noir hover:text-gold transition-colors"
                  >
                    {t("common.readMore")} →
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gris font-light mb-4">
            {t("apartmentsPage.noResults")}
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
          >
            {t("apartmentsPage.contactUs")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

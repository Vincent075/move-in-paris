"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import apartmentsData from "@/data/apartments.json";
import { useT } from "@/i18n/LocaleProvider";

export default function ApartmentsList() {
  const t = useT();
  const ALL = t("searchBar.allTypes");
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
    { value: "all", label: ALL },
    { value: "studio", label: t("searchBar.studio") },
    { value: "2", label: t("searchBar.twoRooms") },
    { value: "3", label: t("searchBar.threeRooms") },
    { value: "4+", label: t("searchBar.fourRoomsPlus") },
  ];
  const [selectedLocation, setSelectedLocation] = useState(ALL);
  const [selectedType, setSelectedType] = useState("all");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [surfaceMax, setSurfaceMax] = useState("");

  const filtered = apartmentsData.filter((apt) => {
    if (selectedType !== "all") {
      if (selectedType === "studio" && apt.rooms !== 1) return false;
      if (selectedType === "2" && apt.rooms !== 2) return false;
      if (selectedType === "3" && apt.rooms !== 3) return false;
      if (selectedType === "4+" && apt.rooms < 4) return false;
    }
    if (surfaceMin && apt.surface < parseInt(surfaceMin)) return false;
    if (surfaceMax && apt.surface > parseInt(surfaceMax)) return false;
    return true;
  });

  return (
    <section className="py-16 bg-blanc">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Filters */}
        <div className="bg-blanc-chaud border border-gris-clair/50 p-6 lg:p-8 mb-12">
          <h2 className="font-serif text-xl text-noir mb-6">{t("apartmentsPage.searchTitle")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">{t("searchBar.location")}</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">{t("searchBar.type")}</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              >
                {typesList.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">{t("searchBar.surfaceMin")} (m²)</label>
              <input
                type="number"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">{t("searchBar.surfaceMax")} (m²)</label>
              <input
                type="number"
                value={surfaceMax}
                onChange={(e) => setSurfaceMax(e.target.value)}
                placeholder="150"
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gris">
              {filtered.length} {filtered.length > 1 ? t("apartmentsPage.foundPlural") : t("apartmentsPage.foundSingular")}
            </span>
            <button
              onClick={() => {
                setSelectedLocation(ALL);
                setSelectedType("all");
                setSurfaceMin("");
                setSurfaceMax("");
              }}
              className="text-xs text-gold hover:text-gold-dark transition-colors uppercase tracking-wider"
            >
              {t("apartmentsPage.reset")}
            </button>
          </div>
        </div>

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
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url('${apt.images[0]}')` }}
                  />
                  <div className="absolute bottom-4 right-4 bg-noir-deep/60 text-blanc text-xs px-2 py-1">
                    {apt.images.length} photos
                  </div>
                </div>
              </Link>

              {/* Content */}
              <div className="p-6">
                <Link href={`/appartement/${apt.slug}`}>
                  <h3 className="font-serif text-xl text-noir mb-1 group-hover:text-gold transition-colors">
                    {apt.title}
                  </h3>
                </Link>
                <p className="text-sm text-gris mb-4">{apt.address}</p>

                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-t border-b border-gris-clair/50 [&>div+div]:relative [&>div+div]:before:content-[''] [&>div+div]:before:absolute [&>div+div]:before:left-0 [&>div+div]:before:top-1/2 [&>div+div]:before:-translate-y-1/2 [&>div+div]:before:h-8 [&>div+div]:before:w-px [&>div+div]:before:bg-gris-clair">
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.surface} m²</div>
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
                  {apt.features.slice(0, 3).map((f) => (
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

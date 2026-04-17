"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";

export default function SearchBar() {
  const router = useRouter();
  const t = useT();
  const locations = [
    t("searchBar.allCities"),
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
  const types = [
    t("searchBar.allTypes"),
    t("searchBar.studio"),
    t("searchBar.twoRooms"),
    t("searchBar.threeRooms"),
    t("searchBar.fourRoomsPlus"),
  ];
  const [loc, setLoc] = useState(locations[0]);
  const [type, setType] = useState(types[0]);
  const [surfaceMin, setSurfaceMin] = useState("");
  const [surfaceMax, setSurfaceMax] = useState("");

  function handleSearch() {
    router.push("/nos-appartements");
  }

  return (
    <div className="relative z-20 -mt-10 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto px-6"
      >
        <div className="bg-white shadow-2xl shadow-noir-deep/15 p-2.5 flex flex-col md:flex-row items-stretch border border-gris-clair/30">
          {/* Localisation */}
          <div className="flex-1 px-5 py-3.5 border-b md:border-b-0 md:border-r border-gris-clair/20">
            <div className="text-[10px] text-gold uppercase tracking-[0.15em] font-semibold mb-1.5">{t("searchBar.location")}</div>
            <select
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none cursor-pointer border-0 p-0"
            >
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Type */}
          <div className="flex-1 px-5 py-3.5 border-b md:border-b-0 md:border-r border-gris-clair/20">
            <div className="text-[10px] text-gold uppercase tracking-[0.15em] font-semibold mb-1.5">{t("searchBar.type")}</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none cursor-pointer border-0 p-0"
            >
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Surface min */}
          <div className="flex-1 px-5 py-3.5 border-b md:border-b-0 md:border-r border-gris-clair/20">
            <div className="text-[10px] text-gold uppercase tracking-[0.15em] font-semibold mb-1.5">{t("searchBar.surfaceMin")}</div>
            <input
              type="text"
              value={surfaceMin}
              onChange={(e) => setSurfaceMin(e.target.value)}
              placeholder="50m²"
              className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none border-0 p-0 placeholder:text-gris/40"
            />
          </div>

          {/* Surface max */}
          <div className="flex-1 px-5 py-3.5 border-b md:border-b-0 md:border-r border-gris-clair/20">
            <div className="text-[10px] text-gold uppercase tracking-[0.15em] font-semibold mb-1.5">{t("searchBar.surfaceMax")}</div>
            <input
              type="text"
              value={surfaceMax}
              onChange={(e) => setSurfaceMax(e.target.value)}
              placeholder="120m²"
              className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none border-0 p-0 placeholder:text-gris/40"
            />
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="bg-noir-deep hover:bg-gold text-white px-8 py-4 md:py-3 flex items-center justify-center gap-2.5 transition-all duration-300 font-medium text-sm tracking-wider group"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {t("searchBar.search")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

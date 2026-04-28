"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import Dropdown from "@/components/Dropdown";

export default function SearchBar() {
  const router = useRouter();
  const t = useT();
  const ALL_LOCATIONS = t("searchBar.allCities");
  const locations = [
    ALL_LOCATIONS,
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
    { value: "all", label: t("searchBar.allTypes") },
    { value: "studio", label: t("searchBar.studio") },
    { value: "2", label: t("searchBar.twoRooms") },
    { value: "3", label: t("searchBar.threeRooms") },
    { value: "4+", label: t("searchBar.fourRoomsPlus") },
  ];
  const [loc, setLoc] = useState(ALL_LOCATIONS);
  const [type, setType] = useState("all");

  function handleSearch() {
    const params = new URLSearchParams();
    if (loc && loc !== ALL_LOCATIONS) params.set("location", loc);
    if (type && type !== "all") params.set("type", type);
    const query = params.toString();
    router.push(query ? `/nos-appartements?${query}` : "/nos-appartements");
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
          <Dropdown
            label={t("searchBar.location")}
            value={loc}
            options={locations}
            onChange={setLoc}
          />
          <Dropdown
            label={t("searchBar.type")}
            value={type}
            options={types}
            onChange={setType}
          />

          <button
            onClick={handleSearch}
            className="bg-gold-light hover:bg-gold text-noir-deep px-10 py-4 md:py-3 flex items-center justify-center gap-2.5 transition-all duration-300 font-semibold text-sm tracking-[0.15em] uppercase group"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {t("searchBar.search")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex-1 border-b md:border-b-0 md:border-r border-gris-clair/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 group"
      >
        <span className="flex flex-col min-w-0">
          <span className="text-[10px] text-gold-dark uppercase tracking-[0.15em] font-semibold mb-1.5">
            {label}
          </span>
          <span className="text-noir text-sm font-medium truncate">{value}</span>
        </span>
        <span className="text-gris-clair group-hover:text-gold transition-colors shrink-0">
          <Chevron open={open} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white shadow-2xl shadow-noir-deep/20 border border-gris-clair/40 max-h-[320px] overflow-y-auto py-1.5"
          >
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`px-5 py-2.5 text-sm cursor-pointer transition-colors ${
                    selected
                      ? "bg-gold/10 text-noir font-medium"
                      : "text-noir hover:bg-blanc-chaud"
                  }`}
                >
                  {opt}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

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
            className="bg-gold hover:bg-noir-deep text-noir-deep hover:text-blanc px-10 py-4 md:py-3 flex items-center justify-center gap-2.5 transition-all duration-300 font-semibold text-sm tracking-[0.15em] uppercase group"
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

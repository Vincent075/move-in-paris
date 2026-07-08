"use client";

import { useState } from "react";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d === 1 ? "1ᵉʳ" : d} ${MONTHS[m - 1].toLowerCase()} ${y}`;
}

type Props = {
  value: string; // ISO yyyy-mm-dd ou ""
  onChange: (iso: string) => void;
};

export default function DatePickerField({ value, onChange }: Props) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lundi = 0
  const nbDays = new Date(view.y, view.m + 1, 0).getDate();

  const moveMonth = (delta: number) =>
    setView(({ y, m }) => {
      const nm = m + delta;
      if (nm < 0) return { y: y - 1, m: 11 };
      if (nm > 11) return { y: y + 1, m: 0 };
      return { y, m: nm };
    });

  const pick = (d: number) => {
    onChange(`${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left bg-white border border-gris-clair px-4 py-3.5 font-light text-[15px] focus:outline-none focus:border-gold hover:border-gold transition-colors cursor-pointer flex items-center justify-between gap-3"
      >
        <span className={value ? "text-noir" : "text-gris/50"}>
          {value ? fmt(value) : "Choisir une date"}
        </span>
        <span className="text-gold text-[10px]">◆</span>
      </button>

      {open && (
        <>
          {/* backdrop : ferme au tap à côté */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          <div className="absolute z-30 mt-2 left-0 w-[300px] bg-white border border-gris-clair shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Mois précédent"
                className="w-9 h-9 rounded-none! border border-gris-clair text-gold font-serif text-lg flex items-center justify-center hover:border-gold hover:bg-gold/10 transition-all cursor-pointer bg-transparent"
              >
                ‹
              </button>
              <div className="font-serif italic text-[17px] text-noir">
                {MONTHS[view.m]} {view.y}
              </div>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Mois suivant"
                className="w-9 h-9 rounded-none! border border-gris-clair text-gold font-serif text-lg flex items-center justify-center hover:border-gold hover:bg-gold/10 transition-all cursor-pointer bg-transparent"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center text-[10px] tracking-[0.1em] uppercase text-gris py-1.5">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`v-${i}`} />
              ))}
              {Array.from({ length: nbDays }).map((_, i) => {
                const d = i + 1;
                const iso = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const selected = iso === value;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pick(d)}
                    className={`h-9 text-[13px] rounded-none! border transition-all cursor-pointer ${
                      selected
                        ? "bg-gold border-gold text-noir-deep font-semibold"
                        : isToday
                          ? "border-gold/50 text-noir bg-transparent hover:bg-gold/10"
                          : "border-transparent text-noir bg-transparent hover:bg-gold/10 hover:border-gold/30"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="mt-3 font-sans text-[11px] tracking-[0.1em] uppercase text-gris hover:text-gold transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                Effacer la date
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

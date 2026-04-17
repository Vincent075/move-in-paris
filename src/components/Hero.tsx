"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

const locations = [
  "Toutes les villes",
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

const types = ["Tous", "Studio", "2 pièces", "3 pièces", "4 pièces+"];

export default function Hero() {
  const router = useRouter();
  const [loc, setLoc] = useState("Toutes les villes");
  const [type, setType] = useState("Tous");
  const [surfaceMin, setSurfaceMin] = useState("");

  function handleSearch() {
    router.push("/nos-appartements");
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/apartments/vue-paris.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/70 via-noir-deep/50 to-noir-deep/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-blanc leading-[1.1] mb-8"
        >
          Votre partenaire
          <br />
          <span className="text-gold">location meublée</span>
          <br />
          à Paris
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg md:text-xl text-blanc/70 max-w-2xl mx-auto mb-14 leading-relaxed font-light"
        >
          Appartements meublés haut de gamme au coeur de Paris, dédiés
          exclusivement aux entreprises et à leurs collaborateurs internationaux.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl shadow-noir-deep/30 p-2 flex flex-col md:flex-row items-stretch">
            {/* Localisation */}
            <div className="flex-1 px-5 py-3 border-b md:border-b-0 md:border-r border-gris-clair/30">
              <div className="text-[10px] text-gris uppercase tracking-wider font-semibold mb-1 text-left">Localisation</div>
              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none cursor-pointer border-0 p-0"
              >
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Format */}
            <div className="flex-1 px-5 py-3 border-b md:border-b-0 md:border-r border-gris-clair/30">
              <div className="text-[10px] text-gris uppercase tracking-wider font-semibold mb-1 text-left">Format</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none cursor-pointer border-0 p-0"
              >
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Surface min */}
            <div className="flex-1 px-5 py-3 border-b md:border-b-0 md:border-r border-gris-clair/30">
              <div className="text-[10px] text-gris uppercase tracking-wider font-semibold mb-1 text-left">Surface min</div>
              <input
                type="text"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value)}
                placeholder="50m²"
                className="w-full bg-transparent text-noir text-sm font-medium focus:outline-none border-0 p-0 placeholder:text-gris/50"
              />
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              className="bg-noir-deep hover:bg-gold text-white px-8 py-4 md:py-3 flex items-center justify-center gap-2 transition-all duration-300 font-medium text-sm tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Rechercher
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import apartmentsData from "@/data/apartments.json";

const locations = [
  "Tous",
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

export default function ApartmentsList() {
  const [selectedLocation, setSelectedLocation] = useState("Tous");
  const [selectedType, setSelectedType] = useState("Tous");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [surfaceMax, setSurfaceMax] = useState("");

  const filtered = apartmentsData.filter((apt) => {
    if (selectedType !== "Tous") {
      if (selectedType === "Studio" && apt.rooms !== 1) return false;
      if (selectedType === "2 pièces" && apt.rooms !== 2) return false;
      if (selectedType === "3 pièces" && apt.rooms !== 3) return false;
      if (selectedType === "4 pièces+" && apt.rooms < 4) return false;
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
          <h2 className="font-serif text-xl text-noir mb-6">Rechercher un appartement</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">Localisation</label>
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
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">Surface min (m²)</label>
              <input
                type="number"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-2">Surface max (m²)</label>
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
              {filtered.length} appartement{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                setSelectedLocation("Tous");
                setSelectedType("Tous");
                setSurfaceMin("");
                setSurfaceMax("");
              }}
              className="text-xs text-gold hover:text-gold-dark transition-colors uppercase tracking-wider"
            >
              Réinitialiser
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
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-3 py-1 text-xs uppercase tracking-wider ${
                        apt.status === "Loué"
                          ? "bg-gris text-blanc"
                          : "bg-gold text-noir-deep"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
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

                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-t border-b border-gris-clair/50">
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.surface} m²</div>
                    <div className="text-xs text-gris">Surface</div>
                  </div>
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.rooms}</div>
                    <div className="text-xs text-gris">Pièces</div>
                  </div>
                  <div className="text-center">
                    <div className="text-noir font-medium">{apt.bathrooms}</div>
                    <div className="text-xs text-gris">SdB</div>
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
                  <span className="text-gold font-serif text-lg">Sur demande</span>
                  <Link
                    href={`/appartement/${apt.slug}`}
                    className="text-xs uppercase tracking-wider text-noir hover:text-gold transition-colors"
                  >
                    En savoir plus →
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
            Vous ne trouvez pas votre bonheur ? Contactez-nous pour une recherche personnalisée.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
          >
            Contactez-nous
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

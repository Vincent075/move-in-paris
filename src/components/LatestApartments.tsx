"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const latestApartments = [
  {
    slug: "rue-de-bassano-paris-16",
    title: "Rue de Bassano",
    district: "Paris 16e",
    surface: 62,
    rooms: 2,
    image: "/apartments/salon-orange.jpg",
    status: "À louer",
  },
  {
    slug: "boulevard-malesherbes-paris-17",
    title: "Bd Malesherbes",
    district: "Paris 17e",
    surface: 85,
    rooms: 3,
    image: "/apartments/salon-haussmann.jpg",
    status: "Disponible",
  },
  {
    slug: "",
    title: "Avenue Foch",
    district: "Paris 16e",
    surface: 120,
    rooms: 4,
    image: "/apartments/salon-bibliotheque.jpg",
    status: "Loué",
  },
  {
    slug: "",
    title: "Rue de Lévis",
    district: "Paris 17e",
    surface: 75,
    rooms: 3,
    image: "/apartments/cuisine-entree.jpg",
    status: "Disponible",
  },
  {
    slug: "",
    title: "Rue du Fbg St-Honoré",
    district: "Paris 8e",
    surface: 52,
    rooms: 2,
    image: "/apartments/chambre.jpg",
    status: "À louer",
  },
  {
    slug: "",
    title: "Bd d'Inkermann",
    district: "Neuilly-sur-Seine",
    surface: 28,
    rooms: 1,
    image: "/apartments/salle-de-bain.jpg",
    status: "Disponible",
  },
  {
    slug: "",
    title: "Bd Saint-Germain",
    district: "Paris 5e",
    surface: 68,
    rooms: 3,
    image: "/apartments/vue-paris.jpg",
    status: "À louer",
  },
  {
    slug: "",
    title: "Rue de Ponthieu",
    district: "Paris 8e",
    surface: 95,
    rooms: 4,
    image: "/apartments/cuisine.jpg",
    status: "Loué",
  },
];

// Double the array for seamless infinite scroll
const doubled = [...latestApartments, ...latestApartments];

export default function LatestApartments() {
  return (
    <section className="pt-20 pb-6 bg-blanc overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-12">
        <div className="flex items-end justify-between">
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-gold text-xs tracking-[0.3em] uppercase"
            >
              Nouveautés
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl text-noir mt-3"
            >
              Derniers appartements
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/nos-appartements"
              className="hidden md:inline-block px-8 py-3 border border-gold text-gold text-sm tracking-wider uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
            >
              Voir tout
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scrolling carousel — CSS auto-scroll + native touch swipe */}
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .carousel-track {
          animation: scroll-left 12s linear infinite;
        }
        .carousel-track:hover {
          animation-play-state: paused;
        }
        .carousel-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .carousel-container::-webkit-scrollbar { display: none; }
        @media (pointer: coarse) {
          .carousel-track { animation: none; }
          .carousel-container { scroll-snap-type: x mandatory; }
          .carousel-item { scroll-snap-align: start; }
        }
      `}</style>
      <div className="relative carousel-container">
        <div className="flex gap-6 carousel-track">
          {doubled.map((apt, i) => (
            <Link
              key={i}
              href={apt.slug ? `/appartement/${apt.slug}` : "/nos-appartements"}
              className="flex-shrink-0 w-[280px] md:w-[320px] group carousel-item"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden mb-4">
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                  style={{ backgroundImage: `url('${apt.image}')` }}
                />
                <div className="absolute inset-0 bg-noir-deep/0 group-hover:bg-noir-deep/20 transition-all duration-500" />
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-3 py-1 text-[10px] uppercase tracking-wider font-medium ${
                      apt.status === "Loué"
                        ? "bg-gris text-blanc"
                        : "bg-gold text-noir-deep"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <h3 className="font-serif text-lg text-noir group-hover:text-gold transition-colors">
                {apt.title}
              </h3>
              <p className="text-sm text-gris font-light">{apt.district}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gris">
                <span>{apt.surface} m²</span>
                <span className="w-1 h-1 bg-gold rounded-full" />
                <span>{apt.rooms} pièce{apt.rooms > 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-blanc to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blanc to-transparent pointer-events-none z-10" />
      </div>

      {/* Mobile CTA */}
      <div className="mt-10 text-center md:hidden">
        <Link
          href="/nos-appartements"
          className="inline-block px-8 py-3 border border-gold text-gold text-sm tracking-wider uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
        >
          Voir tous les appartements
        </Link>
      </div>
    </section>
  );
}

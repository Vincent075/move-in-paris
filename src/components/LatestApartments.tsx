"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePickField, useT } from "@/i18n/LocaleProvider";
import apartmentsData from "@/data/apartments.json";

type ApartmentLite = {
  slug: string;
  title: string;
  title_en?: string;
  district: string;
  surface: number;
  rooms: number;
  images: string[];
};

// Show up to 8 apartments; repeat at least twice so the carousel track is wide enough
const source = (apartmentsData as ApartmentLite[]).slice(0, 8);
const latestApartments = source.length > 0 ? source : [];
const doubled = latestApartments.length >= 4
  ? [...latestApartments, ...latestApartments]
  : [...latestApartments, ...latestApartments, ...latestApartments, ...latestApartments];

export default function LatestApartments() {
  const t = useT();
  const pick = usePickField();
  if (doubled.length === 0) return null;
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
              {t("latestApartments.eyebrow")}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl text-noir mt-3"
            >
              {t("latestApartments.title")}
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
              {t("latestApartments.viewAll")}
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
        <div className="flex gap-4 md:gap-6 carousel-track px-5 md:px-0">
          {doubled.map((apt, i) => (
            <Link
              key={i}
              href={apt.slug ? `/appartement/${apt.slug}` : "/nos-appartements"}
              className="flex-shrink-0 w-[78vw] max-w-[280px] md:w-[320px] group carousel-item"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden mb-4">
                {apt.images[0] && (
                  <Image
                    src={apt.images[0]}
                    alt={pick<string>(apt as unknown as Record<string, unknown>, "title")}
                    fill
                    sizes="(min-width: 768px) 320px, 280px"
                    className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-noir-deep/0 group-hover:bg-noir-deep/20 transition-all duration-500" />
              </div>

              {/* Info */}
              <h3 className="font-serif text-lg text-noir group-hover:text-gold transition-colors">
                {pick<string>(apt as unknown as Record<string, unknown>, "title")}
              </h3>
              <p className="text-sm text-gris font-light">{apt.district}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gris">
                <span>{apt.surface} {t("common.surfaceUnit")}</span>
                <span className="w-1 h-1 bg-gold rounded-full" />
                <span>{apt.rooms} {(apt.rooms > 1 ? t("apartment.rooms") : t("apartment.room")).toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Fade edges — desktop only (on touch, the carousel is swipable and the fade looks like a broken border) */}
        <div className="hidden md:block absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-blanc to-transparent pointer-events-none z-10" />
        <div className="hidden md:block absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-blanc to-transparent pointer-events-none z-10" />
      </div>

      {/* Mobile CTA */}
      <div className="mt-10 text-center md:hidden">
        <Link
          href="/nos-appartements"
          className="inline-block px-8 py-3 border border-gold text-gold text-sm tracking-wider uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
        >
          {t("latestApartments.viewAll")}
        </Link>
      </div>
    </section>
  );
}

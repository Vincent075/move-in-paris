"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

export default function Hero() {
  const t = useT();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background — Next.js Image pour AVIF/WebP auto + preload prioritaire */}
      <div className="absolute inset-0">
        <Image
          src="/apartments/hero-salon.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/20 via-noir-deep/15 to-noir-deep/70" />
      </div>

      {/* Content — h1 rendu visible immédiatement pour LCP rapide */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-blanc leading-[1.1] mb-8">
          {t("hero.titlePart1")}
          <br />
          <span className="text-gold">{t("hero.titleHighlight")}</span>
          <br />
          {t("hero.titlePart2")}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-blanc/70 max-w-2xl mx-auto mb-14 leading-relaxed font-light"
        >
          {t("hero.subtitle")}
        </motion.p>
      </div>
    </section>
  );
}

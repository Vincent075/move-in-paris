"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

export default function Hero() {
  const t = useT();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/apartments/hero-salon.jpg')" }}
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
          {t("hero.titlePart1")}
          <br />
          <span className="text-gold">{t("hero.titleHighlight")}</span>
          <br />
          {t("hero.titlePart2")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg md:text-xl text-blanc/70 max-w-2xl mx-auto mb-14 leading-relaxed font-light"
        >
          {t("hero.subtitle")}
        </motion.p>
      </div>
    </section>
  );
}

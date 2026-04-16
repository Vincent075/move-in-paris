"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/apartments/vue-paris.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/70 via-noir-deep/50 to-noir-deep/90" />
      </div>

      {/* Decorative line */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 120 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="absolute top-0 left-1/2 w-px bg-gradient-to-b from-gold to-transparent"
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-6"
        >
          <span className="inline-block px-5 py-2 border border-gold/40 text-gold text-xs tracking-[0.3em] uppercase">
            Depuis 2005 a Paris
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-blanc leading-[1.1] mb-8"
        >
          Votre partenaire
          <br />
          <span className="text-gold">location meublee</span>
          <br />
          a Paris
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="text-lg md:text-xl text-blanc/70 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
        >
          Appartements meublés haut de gamme au coeur de Paris, dédiés
          exclusivement aux entreprises et à leurs collaborateurs
          internationaux. +117 000 nuits d&apos;hébergement assurées.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="#services"
            className="px-10 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
          >
            Decouvrir nos services
          </a>
          <a
            href="#contact"
            className="px-10 py-4 border border-blanc/30 text-blanc font-light tracking-wider uppercase text-sm hover:border-gold hover:text-gold transition-all duration-300"
          >
            Nous contacter
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] tracking-[0.3em] text-blanc/40 uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-gold to-transparent"
        />
      </motion.div>
    </section>
  );
}

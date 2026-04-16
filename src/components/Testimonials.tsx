"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Move in Paris a trouve un appartement pour notre directeur financier en moins de 48h. Professionnalisme et reactivite remarquables.",
    author: "Marie D.",
    role: "DRH, Groupe international",
    initials: "MD",
  },
  {
    quote:
      "En tant qu'expatrie, j'avais besoin d'un accompagnement complet. L'equipe a gere chaque detail avec une efficacite impressionnante.",
    author: "James W.",
    role: "Expatrie, Secteur financier",
    initials: "JW",
  },
  {
    quote:
      "Proprietaire depuis 8 ans chez Move in Paris, je n'ai jamais eu a me soucier de la gestion de mon bien. Taux d'occupation optimal.",
    author: "Philippe R.",
    role: "Proprietaire, Paris 16e",
    initials: "PR",
  },
];

export default function Testimonials() {
  return (
    <section id="temoignages" className="py-28 bg-noir-deep relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gold text-xs tracking-[0.3em] uppercase"
          >
            Ils nous font confiance
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl md:text-5xl text-blanc mt-4 mb-6"
          >
            Temoignages
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 60 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="h-px bg-gold mx-auto"
          />
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="p-8 border border-blanc/10 hover:border-gold/30 transition-all duration-500 group"
            >
              {/* Quote mark */}
              <div className="font-serif text-6xl text-gold/30 leading-none mb-4 group-hover:text-gold/50 transition-colors">
                &ldquo;
              </div>
              <p className="text-blanc/70 leading-relaxed font-light mb-8">
                {t.quote}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-serif text-sm">
                  {t.initials}
                </div>
                <div>
                  <div className="text-blanc font-medium">{t.author}</div>
                  <div className="text-blanc/40 text-sm">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

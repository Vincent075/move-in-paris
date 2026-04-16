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

        {/* Google Reviews link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <a
            href="https://www.google.com/maps/place/Move+in+Paris/@48.8769,2.2952,17z/data=!4m8!3m7!1s0x47e66f85b3f6e36d:0x5f5f5f5f5f5f5f5f!8m2!3d48.8769!4d2.2952!9m1!1b1!16s"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3 border border-blanc/20 text-blanc/60 text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 16.09V16.2c0-.92.21-1.72.63-2.36.42-.65 1.04-1.18 1.87-1.59.72-.35 1.21-.67 1.47-.96.26-.29.39-.65.39-1.07 0-.45-.16-.8-.48-1.06-.32-.26-.75-.39-1.29-.39-.51 0-.96.13-1.34.4-.38.26-.63.66-.76 1.18L8.86 9.7c.27-.92.82-1.63 1.66-2.14C11.36 7.06 12.34 6.8 13.46 6.8c1.26 0 2.26.33 3 .99.74.66 1.11 1.51 1.11 2.56 0 .84-.25 1.57-.74 2.19-.49.62-1.19 1.13-2.09 1.53-.63.28-1.06.57-1.28.87-.22.3-.33.72-.33 1.27v.37h-2.54zm-.14 3.87c-.35-.35-.53-.79-.53-1.3 0-.51.18-.95.53-1.3.36-.35.8-.53 1.33-.53.53 0 .97.18 1.32.53.35.35.53.79.53 1.3 0 .51-.18.95-.53 1.3-.35.35-.79.53-1.32.53-.53 0-.97-.18-1.33-.53z"/>
            </svg>
            Voir tous nos avis Google
          </a>
        </motion.div>
      </div>
    </section>
  );
}

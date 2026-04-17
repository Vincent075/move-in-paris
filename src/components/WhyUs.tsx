"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 117, suffix: "K+", label: "Nuits d'hébergement" },
  { value: 95, suffix: "%+", label: "Taux d'occupation" },
  { value: 3, suffix: " mois", label: "Durée moyenne de séjour" },
  { value: 1300, suffix: "+", label: "Collaborateurs accueillis" },
];

const reasons = [
  {
    title: "Loyers garantis par l'employeur",
    text: "Notre clientèle est exclusivement corporate : grandes entreprises, institutions internationales. Les loyers sont garantis par l'employeur — zéro impayé.",
  },
  {
    title: "Rentabilité supérieure",
    text: "En moyenne +30% de revenus supplémentaires par rapport à une location classique. Jusqu'à 55€/m² en bail corporate.",
  },
  {
    title: "Interlocuteur unique et responsable",
    text: "Move in Paris est votre seul contact et assume l'entière responsabilité de l'état de votre bien. Assistance technique 7j/7.",
  },
];

export default function WhyUs() {
  return (
    <section id="pourquoi" className="relative overflow-hidden">
      {/* Stats banner */}
      <div className="bg-noir-deep py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-serif text-4xl md:text-5xl text-gold font-bold mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-blanc/50 text-sm tracking-wide uppercase">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Why us content */}
      <div className="py-28 bg-blanc-chaud">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Image */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div
                className="aspect-[4/5] bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('/apartments/salon-haussmann.jpg')",
                }}
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 border-2 border-gold" />
            </motion.div>

            {/* Right - Content */}
            <div>
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-gold text-xs tracking-[0.3em] uppercase"
              >
                Pourquoi Move in Paris
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="font-serif text-4xl md:text-5xl text-noir mt-4 mb-12"
              >
                L&apos;excellence au service
                <br />
                <span className="text-gold">de votre projet</span>
              </motion.h2>

              <div className="space-y-8">
                {reasons.map((reason, i) => (
                  <motion.div
                    key={reason.title}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.15 }}
                    className="flex gap-6"
                  >
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center border border-gold/30 text-gold font-serif text-lg">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl text-noir mb-2">
                        {reason.title}
                      </h3>
                      <p className="text-gris font-light leading-relaxed">
                        {reason.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const partners = [
  { name: "AXA", file: "/logos/Axa-logo.png" },
  { name: "Danone", file: "/logos/Danone-Logo-2017-present.png" },
  { name: "LinkedIn", file: "/logos/LinkedIn_Logo.svg.png" },
  { name: "Engie", file: "/logos/Logo-engie.svg.png" },
  { name: "Renault", file: "/logos/Logo-Renault-thumb-1280x720-1.png" },
  { name: "Vinci", file: "/logos/Logo-Vinci-1.png" },
  { name: "L'Oréal", file: "/logos/LOreal-Logo.jpg" },
  { name: "LVMH", file: "/logos/MC.PA-e4d57ba5.png" },
  { name: "OCDE", file: "/logos/ocde-logo-900x213.webp" },
  { name: "Pernod Ricard", file: "/logos/Pernod-Ricard-logo.png" },
  { name: "Accenture", file: "/logos/png-clipart-accenture-new-logo-icons-logos-emojis-iconic-brands.png" },
  { name: "Dior", file: "/logos/png-clipart-logo-brand-christian-dior-se-design-product-design.png" },
  { name: "Goldman Sachs", file: "/logos/png-clipart-product-design-goldman-sachs-brand-logo-chief-executive-design-blue-text.png" },
  { name: "Sanofi", file: "/logos/Sanofi-Logo-2011.png" },
  { name: "Technip Energies", file: "/logos/TECHNIP_ENERGIES_LOGO.png" },
];

const doubled = [...partners, ...partners];

export default function PartnerLogos() {
  return (
    <section className="py-16 bg-blanc-chaud overflow-hidden border-t border-b border-noir/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-10 text-center">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-gold text-xs tracking-[0.3em] uppercase"
        >
          Ils nous font confiance
        </motion.span>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-2xl md:text-3xl text-noir mt-3"
        >
          Nos partenaires corporate
        </motion.h3>
      </div>

      <style>{`
        @keyframes logos-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logos-track {
          animation: logos-scroll-left 30s linear infinite;
          width: max-content;
        }
        .logos-track:hover { animation-play-state: paused; }
        .logos-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .logos-container::-webkit-scrollbar { display: none; }
        @media (pointer: coarse) {
          .logos-track { animation: none; }
          .logos-container { scroll-snap-type: x proximity; }
          .logos-item { scroll-snap-align: center; }
        }
      `}</style>

      <div className="relative logos-container">
        <div className="flex gap-14 md:gap-20 items-center logos-track px-6">
          {doubled.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex-shrink-0 logos-item flex items-center justify-center h-20 w-[160px] md:w-[200px] opacity-60 hover:opacity-100 transition-opacity duration-500"
              title={p.name}
            >
              <Image
                src={p.file}
                alt={p.name}
                width={200}
                height={80}
                className="max-h-14 md:max-h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          ))}
        </div>

        <div className="absolute top-0 left-0 w-20 md:w-32 h-full bg-gradient-to-r from-blanc-chaud to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-20 md:w-32 h-full bg-gradient-to-l from-blanc-chaud to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}

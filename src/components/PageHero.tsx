"use client";

import { motion } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
}

export default function PageHero({ title, subtitle, breadcrumb }: PageHeroProps) {
  const t = useT();
  return (
    <section className="relative pt-32 pb-20 bg-noir-deep overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {breadcrumb && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-blanc/40 mb-6"
          >
            <a href="/" className="hover:text-gold transition-colors">{t("apartmentsPage.breadcrumbHome")}</a>
            <span>/</span>
            <span className="text-gold">{breadcrumb}</span>
          </motion.div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-4xl md:text-6xl text-blanc mb-4"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blanc/60 text-lg font-light max-w-2xl"
          >
            {subtitle}
          </motion.p>
        )}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="h-px bg-gold mt-8"
        />
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  image?: string;
}

export default function PageHero({ title, subtitle, breadcrumb, image }: PageHeroProps) {
  const t = useT();

  if (image) {
    return (
      <section className="relative h-[65vh] lg:h-[75vh] overflow-hidden">
        {/* Background image */}
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
        {/* Gradient overlay : sombre en haut pour le header, sombre en bas pour le texte */}
        <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/70 via-noir-deep/30 to-noir-deep/85" />
        {/* Content : texte aligné en bas */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col justify-end pb-16 lg:pb-24">
          {breadcrumb && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden lg:flex items-center gap-2 text-xs text-blanc/60 mb-6"
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
            className="font-serif text-4xl md:text-6xl lg:text-7xl text-blanc mb-4 max-w-3xl"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-blanc/80 text-lg lg:text-xl font-light max-w-2xl"
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

"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface CTABannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export default function CTABanner({
  title,
  subtitle,
  buttonText,
  buttonHref,
  secondaryText,
  secondaryHref,
}: CTABannerProps) {
  return (
    <section className="py-20 bg-noir-deep">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-serif text-3xl md:text-4xl text-blanc mb-4"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-blanc/60 font-light mb-8 max-w-xl mx-auto"
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href={buttonHref}
            className="px-10 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
          >
            {buttonText}
          </Link>
          {secondaryText && secondaryHref && (
            <Link
              href={secondaryHref}
              className="px-10 py-4 border border-blanc/30 text-blanc font-light tracking-wider uppercase text-sm hover:border-gold hover:text-gold transition-all duration-300"
            >
              {secondaryText}
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}

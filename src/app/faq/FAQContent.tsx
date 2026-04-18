"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { faqs } from "@/data/faqs";


const categoryIcons: Record<string, string> = {
  "Propriétaires": "🏠",
  "Locataires & Entreprises": "🔑",
};

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gris-clair/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-serif text-lg text-noir group-hover:text-gold transition-colors pr-8">
          {q}
        </span>
        <span
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center border border-gris-clair text-gold transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gris font-light leading-relaxed pr-12 whitespace-pre-line">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQContent() {
  const { locale } = useLocale();
  const t = useT();

  if (locale === "en") {
    return (
      <section className="py-20 bg-blanc">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 text-center">
          <div className="p-10 border border-gris-clair/50 bg-blanc-chaud" style={{ borderRadius: 12 }}>
            <div className="text-gold text-4xl mb-6">✦</div>
            <h2 className="font-serif text-2xl text-noir mb-4">{t("faqPage.heroTitle")}</h2>
            <p className="text-gris font-light leading-relaxed mb-8">
              {t("faqPage.contentNotice")}
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
            >
              {t("faqPage.ctaButton")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-blanc">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        {faqs.map((cat, catIdx) => (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${catIdx > 0 ? "mt-20 pt-20 border-t-2 border-gold/20" : ""}`}
          >
            {/* Category header */}
            <div className="flex items-center gap-5 mb-10">
              <div
                className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-3xl shadow-lg shadow-gold/20"
                style={{ borderRadius: 10 }}
              >
                {categoryIcons[cat.category] || "✦"}
              </div>
              <div>
                <span className="text-gold text-xs tracking-[0.3em] uppercase">
                  Pour les {cat.category.toLowerCase()}
                </span>
                <h2 className="font-serif text-2xl md:text-3xl text-noir mt-1">
                  {cat.category}
                </h2>
              </div>
            </div>
            <div>
              {cat.questions.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

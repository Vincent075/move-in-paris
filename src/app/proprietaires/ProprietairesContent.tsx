"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useT, useTArray } from "@/i18n/LocaleProvider";

type Avantage = { title: string; desc: string };
type Step = { title: string; desc: string };

export default function ProprietairesContent() {
  const t = useT();
  const avantages = useTArray<Avantage>("owners.avantages");
  const steps = useTArray<Step>("owners.process");

  return (
    <>
      {/* Intro */}
      <section className="py-20 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("owners.introEyebrow")}</span>
              <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-6">
                {t("owners.introTitleLine1")}
                <br />
                <span className="text-gold">{t("owners.introTitleLine2")}</span>
              </h2>

              {/* Banner Service 100% gratuit */}
              <div
                className="mb-6 p-5 bg-gradient-to-r from-gold/10 to-gold/5 border-l-4 border-gold"
                style={{ borderRadius: 10 }}
              >
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-serif text-lg text-noir mb-1">{t("owners.bannerTitle")}</div>
                    <p className="text-sm text-gris font-light leading-relaxed">
                      {t("owners.bannerText1")} <strong className="text-noir font-medium">{t("owners.bannerText1Strong")}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-gris font-light leading-relaxed">
                <p>{t("owners.introP1")}</p>
                <p>
                  {t("owners.introP2a")} <strong className="text-noir font-medium">{t("owners.introP2Strong1")}</strong> {t("owners.introP2b")} <strong className="text-noir font-medium">{t("owners.introP2Strong2")}</strong> {t("owners.introP2c")}
                </p>
                <p>
                  {t("owners.introP3a")} <strong className="text-noir font-medium">{t("owners.introP3Strong")}</strong>{t("owners.introP3b")}
                </p>
              </div>
              <Link
                href="/proposer-mon-appartement"
                className="inline-block mt-8 px-8 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
              >
                {t("owners.ctaSubmit")}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="aspect-[4/5] bg-cover bg-center"
                style={{ backgroundImage: "url('/apartments/chambre.jpg')" }}
              />
              <div className="absolute -bottom-6 -right-6 w-40 h-40 border-2 border-gold" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 bg-blanc-chaud">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("owners.avantagesEyebrow")}</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">{t("owners.avantagesTitle")}</h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {avantages.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-blanc border border-gris-clair/50 hover:border-gold/30 transition-all duration-500"
              >
                <span className="font-serif text-3xl text-gold/30 font-bold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-xl text-noir mt-3 mb-3">{item.title}</h3>
                <p className="text-gris font-light leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-blanc">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("owners.processEyebrow")}</span>
            <h2 className="font-serif text-3xl text-noir mt-3">{t("owners.processTitle")}</h2>
          </div>
          <div className="space-y-12">
            {steps.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-8 items-start"
              >
                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border-2 border-gold text-gold font-serif text-xl">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-serif text-xl text-noir mb-2">{item.title}</h3>
                  <p className="text-gris font-light leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

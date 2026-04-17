"use client";

import { motion } from "framer-motion";
import { useT, useTArray } from "@/i18n/LocaleProvider";

const icons: React.ReactNode[] = [
  <svg key="0" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.08A.624.624 0 005.433 13l5.384 3.08a.624.624 0 00.603 0l5.384-3.08a.624.624 0 00-.603-1.08l-5.384 3.08a.624.624 0 01-.603 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M5.625 5.625h12.75M3.75 8.25h16.5" />
  </svg>,
  <svg key="1" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>,
  <svg key="2" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="3" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>,
  <svg key="4" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
  </svg>,
  <svg key="5" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.08M15.75 6.75l-5.384 3.08m0 0l5.384 3.08M9.75 9.832V5.25m0 0L15.75 2.25M9.75 5.25L3.75 2.25" />
  </svg>,
];

type Engagement = { title: string; desc: string };

export default function AboutContent() {
  const t = useT();
  const engagements = useTArray<Engagement>("about.engagements");
  const statsLabels = useTArray<string>("about.statsLabels");
  const statsValues = ["117K+", "95%+", "1300+", "0"];

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
              <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("about.introEyebrow")}</span>
              <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-6">
                {t("about.introTitleLine1")}
                <br />
                <span className="text-gold">{t("about.introTitleLine2")}</span>
              </h2>
              <div className="space-y-4 text-gris font-light leading-relaxed">
                <p>
                  <strong className="text-noir font-medium">{t("about.introP1Strong")}</strong> {t("about.introP1")}
                </p>
                <p>{t("about.introP2")}</p>
                <p>{t("about.introP3")}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="aspect-[4/5] bg-cover bg-center"
                style={{ backgroundImage: "url('/apartments/salon-orange.jpg')" }}
              />
              <div className="absolute -bottom-6 -left-6 w-40 h-40 border-2 border-gold" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6 engagements */}
      <section className="py-20 bg-blanc-chaud">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("about.engagementsEyebrow")}</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">
              {t("about.engagementsTitle")}
            </h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {engagements.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-blanc border border-gris-clair/50 hover:border-gold/30 transition-all duration-500 group"
              >
                <div className="text-gold mb-5 group-hover:scale-110 transition-transform duration-300">
                  {icons[i]}
                </div>
                <h3 className="font-serif text-xl text-noir mb-3">{item.title}</h3>
                <p className="text-gris font-light leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Chiffres */}
      <section className="py-16 bg-noir-deep">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {statsLabels.map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-serif text-3xl md:text-4xl text-gold font-bold mb-1">{statsValues[i]}</div>
                <div className="text-blanc/50 text-xs tracking-wide uppercase">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Adresses */}
      <section className="py-20 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">{t("about.officesEyebrow")}</span>
            <h2 className="font-serif text-3xl text-noir mt-3">{t("about.officesTitle")}</h2>
          </div>
          <div className="relative">
            <iframe
              title="Localisation Move in Paris"
              src="https://www.google.com/maps?q=26+rue+de+l%27Etoile+75017+Paris&t=m&z=16&output=embed"
              className="w-full h-[380px] md:h-[480px] border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              style={{ borderRadius: 10 }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-10 bg-blanc px-8 py-6 md:px-10 md:py-7 text-center shadow-2xl shadow-noir-deep/20 w-[90%] max-w-sm"
              style={{ borderRadius: 10 }}
            >
              <p className="font-serif text-xl md:text-2xl text-noir">26, rue de l&apos;Étoile</p>
              <p className="text-gris font-light mt-1">75017 Paris</p>
              <a
                href="tel:+33145200603"
                className="inline-block mt-3 text-gold font-medium hover:text-gold-light transition-colors"
              >
                +33 1 45 20 06 03
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import { motion } from "framer-motion";

const engagements = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.08A.624.624 0 005.433 13l5.384 3.08a.624.624 0 00.603 0l5.384-3.08a.624.624 0 00-.603-1.08l-5.384 3.08a.624.624 0 01-.603 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M5.625 5.625h12.75M3.75 8.25h16.5" />
      </svg>
    ),
    title: "Appartements de qualité",
    desc: "Nous veillons au maintien d'un haut niveau de qualité : chaque appartement est régulièrement contrôlé et conservé dans l'état que vous nous avez confié.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "Interlocuteur unique",
    desc: "Move in Paris est votre seul contact et assume l'entière responsabilité de l'état de votre bien. Un seul responsable, zéro complexité.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Assistance technique 7j/7",
    desc: "Nos locataires bénéficient d'une assistance technique 7j/7. Chaque problème est traité immédiatement, votre bien est préservé en permanence.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "Ménage inclus",
    desc: "Un ménage hebdomadaire est assuré par notre personnel qualifié et salarié. Votre appartement est entretenu en continu, sans aucun frais pour vous.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
      </svg>
    ),
    title: "Clientèle corporate exclusive",
    desc: "Grandes entreprises, institutions internationales et leurs collaborateurs expatriés. Les loyers sont garantis par l'employeur — zéro impayé.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.08M15.75 6.75l-5.384 3.08m0 0l5.384 3.08M9.75 9.832V5.25m0 0L15.75 2.25M9.75 5.25L3.75 2.25" />
      </svg>
    ),
    title: "Gestion opérationnelle complète",
    desc: "Suivi technique, interventions, coordination des réparations. Vous n'avez rien à gérer, nous nous occupons de tout.",
  },
];

export default function AboutContent() {
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
              <span className="text-gold text-xs tracking-[0.3em] uppercase">Notre histoire</span>
              <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-6">
                Une solution locative
                <br />
                <span className="text-gold">clés en main</span>
              </h2>
              <div className="space-y-4 text-gris font-light leading-relaxed">
                <p>
                  <strong className="text-noir font-medium">Move in Paris</strong> est spécialisée dans la location d&apos;appartements meublés
                  avec services, dédiés exclusivement aux entreprises et à leurs collaborateurs internationaux.
                </p>
                <p>
                  En tant que propriétaire partenaire, vous bénéficiez d&apos;une gestion locative complète et d&apos;une
                  valorisation optimale de votre bien, sans aucun souci au quotidien.
                </p>
                <p>
                  Notre service Transaction vous accompagne également à chaque étape de l&apos;achat ou de la vente
                  d&apos;un bien, qu&apos;il s&apos;agisse de votre résidence ou d&apos;un investissement locatif clés en main.
                </p>
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
                style={{
                  backgroundImage: "url('/apartments/salon-orange.jpg')",
                }}
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
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Nos engagements</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">
              6 raisons de nous faire confiance
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
                  {item.icon}
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
            {[
              { value: "117K+", label: "Nuits d'hébergement" },
              { value: "95%+", label: "Taux d'occupation" },
              { value: "1300+", label: "Collaborateurs accueillis" },
              { value: "0", label: "Impayé — loyers garantis" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-serif text-3xl md:text-4xl text-gold font-bold mb-1">{stat.value}</div>
                <div className="text-blanc/50 text-xs tracking-wide uppercase">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Adresses */}
      <section className="py-20 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Nos bureaux</span>
            <h2 className="font-serif text-3xl text-noir mt-3">Où nous trouver</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: "Agence principale", address: "26, rue de l'Étoile", city: "75017 Paris", tel: "+33 1 45 20 06 03" },
              { name: "Siège administratif", address: "35, rue Davioud", city: "75016 Paris", tel: "+33 1 45 20 06 03" },
            ].map((office) => (
              <div key={office.name} className="p-8 border border-gris-clair/50 hover:border-gold/30 transition-all">
                <h3 className="font-serif text-xl text-noir mb-2">{office.name}</h3>
                <p className="text-gris font-light">{office.address}</p>
                <p className="text-gris font-light">{office.city}</p>
                <p className="text-gold mt-3">{office.tel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

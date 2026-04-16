"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    category: "Locataires & Entreprises",
    questions: [
      {
        q: "Quelle est la durée minimum de location ?",
        a: "Nos baux meublés corporate démarrent à partir d'un mois, avec une durée idéale de 3 à 12 mois. Des baux plus longs sont possibles selon les cas.",
      },
      {
        q: "Quels services sont inclus dans le loyer ?",
        a: "Le loyer inclut l'appartement entièrement meublé et équipé, le wifi, l'assurance habitation, et l'accès à notre service d'assistance 7j/7. Le ménage régulier est disponible en option.",
      },
      {
        q: "Comment se passe la réservation ?",
        a: "Contactez-nous avec vos critères (quartier, taille, budget, dates). Nous vous proposons une sélection adaptée, organisons les visites, et gérons l'ensemble du processus jusqu'à la remise des clés.",
      },
      {
        q: "Les charges sont-elles incluses ?",
        a: "Oui, la plupart de nos locations incluent les charges (eau, chauffage, électricité) dans le loyer. Les conditions exactes sont précisées dans chaque annonce.",
      },
      {
        q: "Peut-on visiter l'appartement avant de signer ?",
        a: "Absolument. Nous organisons des visites physiques ou virtuelles (pour les expatriés à l'étranger) de chaque bien avant toute signature.",
      },
    ],
  },
  {
    category: "Propriétaires",
    questions: [
      {
        q: "Quel type de bien acceptez-vous ?",
        a: "Nous acceptons les appartements meublés (ou à meubler) situés à Paris et en proche banlieue ouest (Neuilly, Levallois, Boulogne). Le bien doit être en bon état et disponible pour au moins 12 mois.",
      },
      {
        q: "Quels sont vos honoraires de gestion ?",
        a: "Nos honoraires sont transparents et adaptés à chaque situation. Contactez-nous pour une estimation personnalisée gratuite.",
      },
      {
        q: "Comment sélectionnez-vous les locataires ?",
        a: "Chaque candidature est rigoureusement vérifiée : identité, contrat de travail, revenus, garanties employeur. Nous travaillons exclusivement avec une clientèle corporate et expatriée.",
      },
      {
        q: "Quel régime fiscal pour la location meublée ?",
        a: "La location meublée bénéficie du statut LMNP (Loueur Meublé Non Professionnel) qui offre des avantages fiscaux significatifs. Nous vous orientons vers nos partenaires comptables spécialisés.",
      },
      {
        q: "Que se passe-t-il en cas de problème dans l'appartement ?",
        a: "Notre service technique intervient 7j/7. Nous gérons toutes les interventions (plomberie, électricité, serrurerie) et les petites réparations sans que vous ayez à intervenir.",
      },
    ],
  },
];

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
            <p className="pb-5 text-gris font-light leading-relaxed pr-12">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQContent() {
  return (
    <section className="py-20 bg-blanc">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        {faqs.map((cat) => (
          <div key={cat.category} className="mb-16 last:mb-0">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">{cat.category}</span>
              <div className="h-px w-12 bg-gold mt-3" />
            </motion.div>
            <div>
              {cat.questions.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

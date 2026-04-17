"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    category: "Propriétaires",
    questions: [
      {
        q: "Combien coûte votre service pour un propriétaire ?",
        a: "Notre service est entièrement gratuit pour le propriétaire. Aucun frais de mise en location, aucun honoraire de gestion, aucune commission ponctionnée sur votre loyer. Vous percevez 100 % du loyer convenu au contrat, charges comprises. Nous nous rémunérons exclusivement auprès de nos clients corporate.",
      },
      {
        q: "Que comprend le loyer versé au propriétaire ?",
        a: "Le loyer que vous percevez chaque mois est un loyer charges comprises : il inclut déjà toutes les charges et coûts liés à l'appartement (charges d'immeuble, électricité, gaz, internet + TV, Canal+, entretien chaudière, taxe d'enlèvement des ordures ménagères). Vous n'avez aucune régularisation à faire, aucune facture surprise à payer : tout est centralisé et pris en charge dans le cadre de notre modèle.",
      },
      {
        q: "Quels types de biens acceptez-vous ?",
        a: "Nous commercialisons des appartements meublés haut de gamme situés à Paris intra-muros et en proche banlieue ouest (Neuilly-sur-Seine, Levallois-Perret, Boulogne-Billancourt). Le bien doit être en bon état général, entièrement équipé et disponible pour une mise en location d'au moins 12 mois.",
      },
      {
        q: "Quelle est la durée du mandat ?",
        a: "Le contrat de commercialisation est signé pour une durée d'un an, renouvelable par tacite reconduction. Le propriétaire peut résilier avec un préavis de 2 mois avant l'échéance annuelle, ou après 30 jours consécutifs de vacance locative. Move in Paris peut quant à elle résilier à tout moment avec un préavis d'un mois.",
      },
      {
        q: "Quand et comment êtes-vous payé ?",
        a: "Le règlement du loyer s'effectue par virement bancaire, à terme échu, au prorata de l'occupation effective par nos clients corporate. Nos propriétaires partenaires reçoivent chaque trimestre un reporting détaillé : revenus, occupation, interventions, état du bien.",
      },
      {
        q: "Comment est révisé le loyer chaque année ?",
        a: "Pour les locations d'une durée inférieure à 1 an (modèle corporate courant), le loyer charges comprises est révisé à la hausse de 1,5 % par an à la date anniversaire du contrat. Pour les locations d'une durée supérieure à 1 an, la révision suit l'indice IRL publié par l'INSEE.",
      },
      {
        q: "Y a-t-il un dépôt de garantie ?",
        a: "Pour nos locations corporate de moins de 9 mois (cas majoritaire), aucun dépôt de garantie n'est exigé — le locataire reste responsable des éventuelles dégradations qui sont facturées sur justificatif à l'entreprise cliente. Pour les locations d'un an ou plus, un dépôt de 2 mois de loyer charges comprises peut être demandé et reversé intégralement au propriétaire.",
      },
      {
        q: "Comment se passent les états des lieux ?",
        a: "Move in Paris réalise un état des lieux photographique complet entre chaque occupant, incluant l'inventaire détaillé du mobilier et des équipements. Cette documentation sert de référence contractuelle. En cas de dégradation constatée, nous gérons directement l'évaluation des coûts et la facturation à l'entreprise cliente — vous n'avez rien à faire.",
      },
      {
        q: "Quel est le régime fiscal applicable ?",
        a: "La location meublée relève du statut LMNP (Loueur en Meublé Non Professionnel), avec deux options : micro-BIC (abattement forfaitaire de 50 % jusqu'à 77 700 € de recettes) ou régime réel simplifié (déduction des charges réelles + amortissement du bien, très avantageux à Paris). Nous orientons nos propriétaires partenaires vers des experts-comptables spécialisés LMNP.",
      },
      {
        q: "Quel cadre juridique pour les baux que vous signez ?",
        a: "Nos contrats sont soumis aux articles 1714 à 1762 du Code Civil et sont exclus de la loi du 6 juillet 1989 : il s'agit de baux de logement de fonction destinés aux salariés de l'entreprise locataire. Cela offre une grande flexibilité sur la durée et le loyer, tout en garantissant une sécurité juridique totale.",
      },
      {
        q: "Qui s'occupe de l'entretien et des petites réparations ?",
        a: "Move in Paris gère l'intégralité de la maintenance opérationnelle : assistance technique du lundi au vendredi (9h-19h), astreinte 24/7 pour les urgences, coordination des interventions (plomberie, électricité, serrurerie, électroménager), ménage hebdomadaire entre occupants, changement de linge. Vous n'êtes contacté que pour les décisions importantes.",
      },
      {
        q: "Mon appartement doit-il être meublé avant la mise en location ?",
        a: "Idéalement oui : l'appartement doit être entièrement meublé et équipé (mobilier, électroménager, vaisselle, linge de maison) pour respecter les standards de notre clientèle corporate. Si ce n'est pas le cas, nos équipes peuvent vous conseiller sur l'ameublement ou vous proposer des partenaires de confiance.",
      },
    ],
  },
  {
    category: "Locataires & Entreprises",
    questions: [
      {
        q: "Quelle est la durée minimum d'une location ?",
        a: "Nos locations corporate démarrent à partir d'un mois, avec une durée idéale de 3 à 12 mois. Des baux plus longs sont possibles au cas par cas. La résiliation à l'initiative du locataire est toujours possible avec un préavis de 15 jours.",
      },
      {
        q: "Qu'est-ce qui est inclus dans le loyer ?",
        a: "Le loyer mensuel inclut absolument tout : l'appartement meublé et entièrement équipé, le wifi haut débit + TV + Canal+, l'électricité, le gaz, le chauffage, l'eau, les charges d'immeuble, la taxe d'enlèvement des ordures ménagères, l'assurance multirisques habitation, le ménage hebdomadaire et le changement de linge, et l'accès à notre service d'assistance technique. Aucun frais caché.",
      },
      {
        q: "Comment se déroule la réservation ?",
        a: "Vous nous transmettez vos critères (quartier, surface, budget, dates). Nous vous proposons une sélection adaptée sous 24h, organisons les visites (physiques ou virtuelles pour les expatriés à l'étranger), puis signature du contrat et remise des clés. Tout peut être bouclé en 48h en cas d'urgence.",
      },
      {
        q: "Quel type de bail signez-vous ?",
        a: "Nos baux sont des contrats de location meublée logement de fonction, soumis aux articles 1714 à 1762 du Code Civil. Ils sont exclus de la loi du 6 juillet 1989, ce qui permet une grande flexibilité (durée libre, loyer libre, résiliation rapide) tout en restant juridiquement sécurisés.",
      },
      {
        q: "Faut-il verser un dépôt de garantie ?",
        a: "Non, aucun dépôt de garantie n'est exigé pour nos locations corporate standard. L'occupant reste responsable de la bonne tenue de l'appartement et du mobilier ; en cas de dégradation avérée constatée à la sortie, une facturation de remise en état est établie sur justificatifs.",
      },
      {
        q: "Quels sont les horaires d'arrivée et de départ ?",
        a: "Check-in : à partir de 14h00. Check-out : avant 10h00. Ce créneau permet à nos équipes d'effectuer le nettoyage complet, l'inventaire et l'inspection photographique entre chaque occupant.",
      },
      {
        q: "Y a-t-il un état des lieux physique ?",
        a: "Nous effectuons une inspection photographique complète dans les 24h précédant votre arrivée : cette documentation fait foi pour l'état initial. Vous avez ensuite 24h après votre arrivée pour signaler tout dommage ou anomalie préexistante. Aucun état des lieux physique contradictoire n'est organisé sauf demande expresse.",
      },
      {
        q: "Comment sont gérés les problèmes techniques ?",
        a: "Un email à assistance@move-in-paris.com suffit (indiquer votre référence de réservation). Assistance technique du lundi au vendredi, 9h-19h. En cas d'urgence hors horaires : +33 6 13 47 31 35. Nous intervenons via notre réseau de prestataires de confiance — jamais d'appel à un artisan extérieur (tarifs excessifs non couverts par l'assurance).",
      },
      {
        q: "Le ménage est-il inclus ?",
        a: "Oui, un ménage hebdomadaire est inclus : nettoyage des surfaces, changement du linge de lit et des serviettes, cuisine, salle de bain, évacuation des ordures. Il suffit de permettre l'accès à l'appartement au moment convenu.",
      },
      {
        q: "L'appartement est-il assuré ?",
        a: "Oui, une assurance multirisques habitation est souscrite par Move in Paris pour l'ensemble de nos biens : responsabilité civile, incendie, dégâts des eaux, vol (jusqu'à 1 000 € en objets de valeur, 6 000 € en vol dans dépendances), bris de glaces, catastrophes naturelles. L'occupant est couvert pendant toute la durée de sa location.",
      },
      {
        q: "Les animaux sont-ils acceptés ?",
        a: "Les animaux sont acceptés au cas par cas, sous réserve d'accord écrit préalable de Move in Paris. L'autorisation est strictement personnelle et limitée à l'animal déclaré. Tout dommage causé par l'animal est à la charge du locataire.",
      },
      {
        q: "Peut-on fumer dans les appartements ?",
        a: "Non. Il est strictement interdit de fumer à l'intérieur des appartements (cigarettes classiques ou électroniques, chicha, etc.). Toute infraction entraîne une facturation de remise en état.",
      },
      {
        q: "Que se passe-t-il si je perds mes clés ?",
        a: "Contactez immédiatement Move in Paris (assistance@move-in-paris.com). Nous missionnons un serrurier de confiance. Les frais de remplacement (serrure, duplication, intervention) sont à la charge du locataire. N'appelez surtout pas un serrurier extérieur : les tarifs dépassent souvent 800 € et ne sont pas couverts par l'assurance.",
      },
    ],
  },
  {
    category: "Entreprises & RH",
    questions: [
      {
        q: "Travaillez-vous directement avec les entreprises ?",
        a: "Oui. Nous sommes partenaires de grands groupes internationaux et des principales agences de relocation opérant en France. Nous facturons directement l'entreprise cliente, avec des conditions de paiement adaptées aux services achats corporate.",
      },
      {
        q: "Peut-on déléguer la gestion de plusieurs collaborateurs ?",
        a: "Absolument. Nous accompagnons des programmes de mobilité complets : plusieurs dizaines de collaborateurs simultanément, gestion centralisée, interlocuteur unique pour la DRH, reporting consolidé. Notre modèle est conçu pour les flux corporate.",
      },
      {
        q: "Quelle est la garantie de paiement pour le propriétaire ?",
        a: "Les loyers sont garantis par l'employeur (entreprise cliente), pas par le salarié expatrié. C'est ce qui nous permet d'afficher un taux d'impayés de 0 %. Les flux financiers sont sécurisés par les procédures d'achats des grandes entreprises.",
      },
      {
        q: "Quels sont vos délais moyens de placement ?",
        a: "Nous trouvons un logement adapté en moyenne sous 48 à 72h pour une demande standard. Pour des besoins plus complexes (famille nombreuse, contraintes d'écoles internationales, quartiers très demandés), comptez 5 à 10 jours.",
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
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                {cat.category}
              </span>
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

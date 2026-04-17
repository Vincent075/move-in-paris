"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/LocaleProvider";

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
        q: "LMNP ou LMP : quelle différence ?",
        a: "Vous êtes LMNP (Loueur en Meublé Non Professionnel) — statut de la grande majorité de nos propriétaires — si vos recettes locatives meublées ne dépassent pas 23 000 €/an, ou si elles représentent moins de 50 % de vos revenus globaux du foyer fiscal. Au-delà de ces deux seuils cumulés, vous basculez en LMP (Professionnel) : cotisations URSSAF, mais aussi avantages (déficit imputable sur le revenu global, exonération possible de plus-value après 5 ans). Depuis 2018, l'inscription au RCS n'est plus un critère.",
      },
      {
        q: "Micro-BIC ou régime réel : comment choisir ?",
        a: "Vos revenus de location meublée relèvent des BIC, avec deux options. Le micro-BIC applique un abattement forfaitaire de 50 % sur les recettes (simple, sans comptabilité, plafond 77 700 €/an). Le régime réel permet de déduire toutes les charges réelles ET d'amortir le bien et le mobilier — résultat : dans la plupart des cas, le bénéfice imposable est réduit à zéro pendant des années. Le réel devient gagnant dès que vos charges + amortissements dépassent 50 % des loyers — quasi systématiquement à Paris en présence d'un crédit, de travaux récents ou de mobilier. Coût d'un expert-comptable spécialisé LMNP : 400 à 800 €/an, déductible.",
      },
      {
        q: "Qu'est-ce que l'amortissement en LMNP et pourquoi c'est la clé ?",
        a: "L'amortissement est une charge comptable qui constate la dépréciation du bien dans le temps — sans mouvement de trésorerie. Au régime réel, vous amortissez la structure (40-50 ans), la toiture et façade (25 ans), les installations techniques (15-20 ans), les aménagements intérieurs (10-15 ans) et le mobilier (5-10 ans). Le terrain (15 à 20 % du prix à Paris) n'est jamais amortissable. Un bon plan d'amortissement par composants réduit souvent le résultat fiscal à zéro. L'amortissement ne peut pas créer de déficit, mais l'excédent est reportable sans limite sur les bénéfices futurs.",
      },
      {
        q: "Quelles charges puis-je déduire au régime réel ?",
        a: "Au régime réel, tout ce qui sert à la location est déductible : intérêts d'emprunt + assurance emprunteur (souvent le poste principal), taxe foncière, charges de copropriété non récupérables, assurance PNO (Propriétaire Non Occupant), CFE, frais de comptabilité et adhésion CGA, travaux d'entretien et de réparation, petits équipements (linge, ustensiles, produits ménagers), frais de déplacement liés à la gestion du bien, frais bancaires. À noter : chez Move in Paris, notre service est 100 % gratuit — aucun honoraire de gestion à comptabiliser.",
      },
      {
        q: "Comment m'immatriculer et obtenir un numéro SIRET ?",
        a: "L'immatriculation est obligatoire et s'effectue en ligne sur formalites.entreprises.gouv.fr : créez un compte, sélectionnez « Déclarer une activité de loueur en meublé », indiquez l'adresse du bien et la date de début d'activité, choisissez votre régime fiscal. Vous recevez votre SIRET sous quelques jours. Un seul numéro SIRET suffit même si vous avez plusieurs biens (chacun déclaré comme établissement secondaire). Créez ensuite votre espace professionnel sur impots.gouv.fr — indispensable pour consulter vos avis de CFE.",
      },
      {
        q: "Qu'est-ce que la CFE et combien ça me coûte ?",
        a: "La Cotisation Foncière des Entreprises est un impôt local dû par tout loueur meublé, basé sur la valeur locative du bien. Exonération automatique la première année d'activité. À Paris, comptez 200 à 1 500 €/an selon l'arrondissement et la surface. Avis disponible uniquement en ligne sur votre espace professionnel impots.gouv.fr — paiement avant le 15 décembre. 100 % déductible en régime réel.",
      },
      {
        q: "Quel est le calendrier fiscal à respecter ?",
        a: "Février-mars : transmettez vos pièces à votre expert-comptable (relevés Move in Paris, factures, taxe foncière). Avril : ouverture de la déclaration sur impots.gouv.fr. Début mai : date limite de la liasse 2031-SD au régime réel (télétransmise par le comptable). Mai-juin : date limite du formulaire 2042 C-PRO (cases 5ND pour micro-BIC, 5NA si bénéfice au réel, 5NK si déficit). Juillet-août : réception de l'avis. Décembre : paiement de la CFE.",
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
];

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

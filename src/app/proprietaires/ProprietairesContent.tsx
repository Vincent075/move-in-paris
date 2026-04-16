"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const avantages = [
  {
    num: "01",
    title: "Clientèle corporate vérifiée",
    desc: "Grandes entreprises, institutions internationales et collaborateurs expatriés. Chaque dossier est vérifié : solvabilité, employeur, garanties. Loyers garantis par l'employeur — zéro impayé.",
  },
  {
    num: "02",
    title: "Rentabilité supérieure",
    desc: "En moyenne +27% de revenus supplémentaires vs location classique. Jusqu'à 55€/m² en bail corporate, avec un régime fiscal avantageux (LMNP).",
  },
  {
    num: "03",
    title: "Gestion intégrale",
    desc: "État des lieux, entretien, ménage, petits travaux, relation locataire, comptabilité : nous gérons absolument tout sans aucune implication de votre part.",
  },
  {
    num: "04",
    title: "Taux d'occupation optimal",
    desc: "Grâce à notre réseau d'entreprises et de relocation agencies, nous maintenons un taux d'occupation supérieur à 95% sur l'ensemble de notre parc.",
  },
  {
    num: "05",
    title: "Bail sécurisé",
    desc: "Baux conformes à la réglementation, assurances adaptées, diagnostics à jour. Votre investissement est juridiquement protégé à chaque instant.",
  },
  {
    num: "06",
    title: "Reporting transparent",
    desc: "Chaque mois, recevez un reporting détaillé : revenus, charges, interventions. Visibilité totale sur la performance de votre bien.",
  },
];

export default function ProprietairesContent() {
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
              <span className="text-gold text-xs tracking-[0.3em] uppercase">Pour les proprietaires</span>
              <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-6">
                Valorisez votre bien avec
                <br />
                <span className="text-gold">la location meublée corporate</span>
              </h2>
              <div className="space-y-4 text-gris font-light leading-relaxed">
                <p>
                  Vous possédez un appartement à Paris ou en proche banlieue ? Confiez-le à Move in Paris et bénéficiez
                  d&apos;une gestion locative complète et d&apos;une valorisation optimale de votre bien.
                </p>
                <p>
                  Notre clientèle exclusive — grandes entreprises, institutions internationales — garantit des loyers
                  payés par l&apos;employeur. Résultat : <strong className="text-noir font-medium">zéro impayé</strong> et en moyenne <strong className="text-noir font-medium">+27% de revenus</strong> par rapport à une location classique.
                </p>
              </div>
              <Link
                href="/proposer-mon-appartement"
                className="inline-block mt-8 px-8 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
              >
                Proposer mon appartement
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
                style={{
                  backgroundImage: "url('/apartments/chambre.jpg')",
                }}
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
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Vos avantages</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">Pourquoi nous confier votre bien</h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {avantages.map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-blanc border border-gris-clair/50 hover:border-gold/30 transition-all duration-500"
              >
                <span className="font-serif text-3xl text-gold/30 font-bold">{item.num}</span>
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
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Comment ca marche</span>
            <h2 className="font-serif text-3xl text-noir mt-3">Un processus simple</h2>
          </div>
          <div className="space-y-12">
            {[
              { step: "1", title: "Estimation gratuite", desc: "Nous visitons votre bien et vous proposons une estimation de loyer basée sur le marché." },
              { step: "2", title: "Mise en valeur", desc: "Photos professionnelles, annonce optimisée, diffusion auprès de notre réseau corporate." },
              { step: "3", title: "Sélection locataire", desc: "Vérification complète de chaque candidature. Vous validez le profil retenu." },
              { step: "4", title: "Gestion complète", desc: "Bail, état des lieux, ménage, maintenance, comptabilité. Vous n'avez rien à faire." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-8 items-start"
              >
                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border-2 border-gold text-gold font-serif text-xl">
                  {item.step}
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

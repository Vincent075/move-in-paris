"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import EstimationForm from "@/app/estimation/EstimationForm";
import PartnerLogos from "@/components/PartnerLogos";
import GoogleReviews from "@/components/GoogleReviews";

// Same dynamic counters as the homepage (cf. src/components/WhyUs.tsx)
const STATS_REFERENCE_DATE = Date.UTC(2026, 3, 18);
const NIGHTS_PER_DAY = 55;
const COLLAB_PER_DAY = 0.6;

function AnimatedCounter({
  target,
  suffix = "",
  formatted = false,
}: {
  target: number;
  suffix?: string;
  formatted?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 2000, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  return (
    <span ref={ref}>
      {formatted ? count.toLocaleString("fr-FR") : count}
      {suffix}
    </span>
  );
}

function useLandingStats() {
  const [stats, setStats] = useState([
    { value: 117000, suffix: "+", label: "Nuits d'hébergement", formatted: true },
    { value: 95, suffix: " %+", label: "Taux d'occupation", formatted: false },
    { value: 3, suffix: " mois", label: "Durée moyenne de séjour", formatted: false },
    { value: 1300, suffix: "+", label: "Collaborateurs accueillis", formatted: false },
  ]);
  useEffect(() => {
    const days = Math.max(0, (Date.now() - STATS_REFERENCE_DATE) / 86_400_000);
    setStats((prev) => [
      { ...prev[0], value: 117000 + Math.floor(days * NIGHTS_PER_DAY) },
      prev[1],
      prev[2],
      { ...prev[3], value: 1300 + Math.floor(days * COLLAB_PER_DAY) },
    ]);
  }, []);
  return stats;
}

const BENEFITS = [
  {
    num: "01",
    title: "Service 100 % gratuit",
    desc: "Zéro frais de gestion, zéro commission, zéro honoraire. Nous nous rémunérons exclusivement sur la marge dégagée auprès de notre clientèle sociétés.",
  },
  {
    num: "02",
    title: "+30 % de revenus",
    desc: "Jusqu'à 55 €/m² hors charges sur les segments premium (8e, 16e, 17e). Notre clientèle sociétés accepte un positionnement haut de gamme.",
  },
  {
    num: "03",
    title: "Zéro impayé",
    desc: "Bail Code Civil signé par l'entreprise (L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs…). Les loyers sont pris en charge et payés par l'employeur.",
  },
  {
    num: "04",
    title: "Taux d'occupation +95 %",
    desc: "Flux continu de directeurs en mission, cadres en relocation, expatriés. Moins de 15 jours de délai moyen entre deux locations.",
  },
  {
    num: "05",
    title: "Un interlocuteur unique",
    desc: "Un gestionnaire dédié pour tout votre bien. Reporting trimestriel, comptabilité, entrées-sorties, ménage hebdomadaire — tout est piloté côté agence.",
  },
  {
    num: "06",
    title: "Fiscalité LMNP optimisée",
    desc: "Régime Loueur en Meublé Non Professionnel : amortissement du bien et du mobilier, BIC au lieu des revenus fonciers. Nous vous orientons vers nos partenaires experts-comptables.",
  },
];

const STEPS = [
  {
    title: "Estimation instantanée",
    desc: "Vous remplissez le formulaire en 60 secondes. Fourchette de loyer en bail société affichée immédiatement à l'écran + email récapitulatif avec la proposition détaillée et notre plaquette de présentation.",
  },
  {
    title: "Visite & ameublement",
    desc: "Nous visitons le bien, identifions les ajustements nécessaires et recommandons la décoration / ameublement pour répondre aux standards attendus par les locataires en bail société.",
  },
  {
    title: "Mise en location",
    desc: "Photos professionnelles, diffusion auprès de notre portefeuille de sociétés partenaires, sélection du locataire et signature du bail société (Code Civil, art. 1714-1762).",
  },
  {
    title: "Gestion opérationnelle",
    desc: "Entrées-sorties, ménage hebdomadaire, assistance technique 7j/7, comptabilité mensuelle, versement du loyer net. Reporting trimestriel.",
  },
];

const TESTIMONIALS = [
  {
    name: "Isabelle R.",
    city: "Propriétaire — Paris 16e",
    quote:
      "J'ai doublé mes revenus par rapport à ma location classique. Zéro gestion de mon côté, les locataires sont irréprochables, et je reçois mon loyer au même jour chaque mois.",
  },
  {
    name: "Marc D.",
    city: "Propriétaire — Paris 17e",
    quote:
      "Deux ans sans un jour de vacance locative. Move in Paris gère vraiment tout : ménage, petites réparations, locataires. Je reçois juste le relevé trimestriel.",
  },
  {
    name: "Claire L.",
    city: "Propriétaire — Neuilly-sur-Seine",
    quote:
      "J'étais sceptique sur le 'zéro frais' mais c'est réel. Pas de commission cachée. L'agence gagne sur sa marge société, moi j'ai le loyer net promis.",
  },
];

const FAQ = [
  {
    q: "Combien coûte la gestion locative Move in Paris ?",
    a: "Notre service est 100 % gratuit pour les propriétaires : aucun frais de gestion, aucune commission, aucun honoraire. Nous nous rémunérons exclusivement sur la marge dégagée auprès de notre clientèle sociétés — le loyer que vous recevez est celui que nous vous annonçons, net.",
  },
  {
    q: "Quel type de bail signez-vous ?",
    a: "Un bail société Code Civil (articles 1714 à 1762 du Code civil) signé directement avec la société locataire. Ce cadre juridique est prévu pour la location meublée à usage professionnel — il permet une grande souplesse contractuelle tout en offrant toutes les garanties du bail d'habitation classique.",
  },
  {
    q: "En combien de temps mon appartement sera-t-il loué ?",
    a: "La plupart de nos biens trouvent preneur en moins de 15 jours. Notre clientèle sociétés exprime des besoins en continu : directeurs en mission, cadres en relocation, expatriés, sociétés internationales logeant leurs collaborateurs. Sur certaines périodes de pic (rentrée, début d'année), le délai tombe à 3–5 jours.",
  },
  {
    q: "Mon appartement est-il assuré pendant la location ?",
    a: "Oui, entièrement. Une assurance habitation multirisque couvre le bien sur toute la durée de la location. Le locataire en bail société bénéficie également de la couverture responsabilité civile de son employeur.",
  },
  {
    q: "Puis-je confier un bien que je ne veux pas meubler moi-même ?",
    a: "Oui. Nous vous accompagnons sur l'ameublement : évaluation sur place, liste de mobilier recommandée, partenariats avec des décorateurs et des distributeurs. Notre clientèle attend un équipement premium — nous calibrons le budget avec vous.",
  },
  {
    q: "Combien de revenus en plus par rapport à une location nue ?",
    a: "En moyenne +30 % par rapport à une location nue classique. Jusqu'à +55 €/m² hors charges sur les segments premium (Triangle d'or, Passy, Étoile, Monceau). À cela s'ajoute l'optimisation fiscale du régime LMNP qui amortit le bien et le mobilier.",
  },
  {
    q: "Quels quartiers Move in Paris couvre-t-il ?",
    a: "Paris intra-muros en priorité — Triangle d'or (8e), 16e (Passy, Trocadéro, Auteuil, Porte Dauphine), 17e (Batignolles, Monceau, Étoile, Ternes), 7e (Invalides, Saint-Germain), 1er–4e. Également Neuilly-sur-Seine, Levallois-Perret, Boulogne-Billancourt.",
  },
  {
    q: "Puis-je récupérer mon bien quand je le souhaite ?",
    a: "Oui. Le bail Code Civil offre une grande souplesse — vous pouvez récupérer votre bien à l'issue de chaque location, ou le bloquer pour vos besoins personnels (vacances, retour, ventes). Nous calibrons le calendrier avec vous.",
  },
];

export default function LandingContent() {
  const stats = useLandingStats();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function scrollToForm() {
    document.getElementById("owner-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* ========================== HERO ========================== */}
      <section className="relative overflow-hidden bg-noir-deep text-blanc">
        {/* Backdrop — filtre adouci pour garder la photo lisible */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-85"
            style={{ backgroundImage: "url('/apartments/hero-salon.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/35 via-noir-deep/30 to-noir-deep/85" />
        </div>

        {/* Minimal top strip: just the logo since no site header */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-6 md:pt-8">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-gold.png" alt="Move in Paris" className="h-14 md:h-16 w-auto" />
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-20 md:pt-24 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-block text-gold text-xs tracking-[0.3em] uppercase mb-4">
              Propriétaires bailleurs — Paris
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1]">
              Confiez votre appartement à l&apos;agence spécialisée en{" "}
              <span className="text-gold">location meublée en bail société</span> à Paris
            </h1>
            <p className="mt-6 text-base md:text-lg text-blanc/80 font-light max-w-2xl leading-relaxed">
              Estimation instantanée en ligne — proposition + plaquette envoyées par email. <span className="text-blanc">0 € de frais.</span>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={scrollToForm}
                className="px-8 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
              >
                Estimer mon loyer gratuitement
              </button>
              <a
                href="tel:+33145200603"
                className="px-8 py-4 border border-gold/60 text-gold hover:bg-gold hover:text-noir-deep tracking-wider uppercase text-sm transition-all duration-300 inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                01 45 20 06 03
              </a>
            </div>
          </motion.div>
        </div>

        {/* KPIs — same live-incrementing counters as the homepage */}
        <div className="relative border-t border-gold/20 bg-noir-deep/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-serif text-3xl md:text-4xl text-gold font-bold">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} formatted={stat.formatted} />
                </div>
                <div className="text-[10px] md:text-xs tracking-[0.15em] uppercase text-blanc/50 mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== ESTIMATION (instantanée) ========================== */}
      <section id="owner-form" className="py-12 md:py-16 bg-blanc-chaud scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center mb-8">
          <span className="text-gold text-xs tracking-[0.3em] uppercase">
            Estimation instantanée — gratuite et sans engagement
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-3">
            Votre loyer en bail société <span className="text-gold">en 60 secondes</span>
          </h2>
          <p className="text-sm md:text-base text-gris font-light max-w-2xl mx-auto">
            Résultat affiché immédiatement à l&apos;écran. Proposition détaillée et plaquette Move in Paris
            envoyées par email en quelques secondes.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-5 text-[11px] md:text-xs text-gris uppercase tracking-[0.15em]">
            <span className="inline-flex items-center gap-1.5"><span className="text-gold">◆</span> Résultat immédiat</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-gold">◆</span> Email + plaquette PDF</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-gold">◆</span> 0 € de frais</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-gold">◆</span> Sans engagement</span>
          </div>
        </div>
        {/* Embedded estimation tool — same logic as /estimation page (instant result + email with proposal + plaquette) */}
        <EstimationForm />
      </section>

      {/* ========================== BENEFITS ========================== */}
      <section className="py-24 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Pourquoi Move in Paris</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">
              L&apos;agence de location meublée premium à Paris
            </h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-8 bg-blanc-chaud border border-gris-clair/40 hover:border-gold/40 transition-all duration-500"
              >
                <span className="font-serif text-3xl text-gold/30 font-bold">{b.num}</span>
                <h3 className="font-serif text-xl text-noir mt-3 mb-3">{b.title}</h3>
                <p className="text-gris font-light leading-relaxed text-sm">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== ILS NOUS FONT CONFIANCE ========================== */}
      <div className="bg-blanc-chaud pt-20 pb-4 text-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <span className="text-gold text-xs tracking-[0.3em] uppercase">Ils nous font confiance</span>
          <h2 className="font-serif text-2xl md:text-3xl text-noir mt-3">
            Un loyer payé par des sociétés du CAC 40
          </h2>
        </div>
      </div>
      <PartnerLogos />

      {/* ========================== PROCESS ========================== */}
      <section className="py-24 bg-blanc-chaud">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Processus</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">
              De l&apos;estimation à la mise en location
            </h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-10">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-5 bg-blanc p-6 border border-gris-clair/40"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 border-gold text-gold font-serif text-lg">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-serif text-lg text-noir mb-2">{s.title}</h3>
                  <p className="text-gris font-light leading-relaxed text-sm">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== AVIS GOOGLE (5 étoiles uniquement) ========================== */}
      <section className="py-24 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Avis Google vérifiés</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">Ce que disent nos clients</h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>
          <GoogleReviews
            fallback={
              <div className="grid md:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t, i) => (
                  <motion.article
                    key={t.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 bg-blanc-chaud border border-gris-clair/40"
                  >
                    <div className="flex text-gold mb-4">{"★★★★★".split("").map((s, idx) => <span key={idx}>{s}</span>)}</div>
                    <p className="text-noir font-light leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-6 pt-4 border-t border-gris-clair/50">
                      <div className="font-serif text-noir">{t.name}</div>
                      <div className="text-xs text-gris">{t.city}</div>
                    </div>
                  </motion.article>
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* ========================== FAQ ========================== */}
      <section className="py-24 bg-blanc-chaud">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Questions fréquentes</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">
              Les réponses aux questions propriétaires
            </h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>
          <div className="divide-y divide-gris-clair/40 border-t border-b border-gris-clair/40">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full text-left py-5 px-2 flex items-start gap-4 hover:bg-blanc transition-colors group"
                  aria-expanded={isOpen}
                >
                  <span className="mt-1 text-gold font-serif text-lg flex-shrink-0 w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="font-serif text-base md:text-lg text-noir group-hover:text-gold transition-colors">
                      {item.q}
                    </div>
                    {isOpen && (
                      <p className="text-gris font-light leading-relaxed mt-3 text-sm md:text-base">
                        {item.a}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gold flex-shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================== FINAL CTA ========================== */}
      <section className="py-24 bg-noir-deep text-blanc relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/apartments/vue-paris.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-noir-deep/95 via-noir-deep/85 to-noir-deep/95" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <span className="text-gold text-xs tracking-[0.3em] uppercase">Prêt à rentabiliser votre bien ?</span>
          <h2 className="font-serif text-3xl md:text-5xl mt-4 mb-6 leading-tight">
            Estimation instantanée
            <br />
            <span className="text-gold">en 60 secondes</span>
          </h2>
          <p className="text-blanc/70 font-light max-w-2xl mx-auto mb-10">
            Fourchette de loyer en bail société affichée immédiatement + proposition détaillée
            et plaquette Move in Paris envoyées par email. Sans engagement, 0 € de frais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button" onClick={scrollToForm}
              className="px-10 py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all"
            >
              Recevoir mon estimation
            </button>
            <a
              href="tel:+33145200603"
              className="px-10 py-4 border border-gold/60 text-gold hover:bg-gold hover:text-noir-deep tracking-wider uppercase text-sm transition-all inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              01 45 20 06 03
            </a>
          </div>
        </div>
      </section>

      {/* ========================== SEO FOOTER LINKS ========================== */}
      <section className="py-12 bg-blanc border-t border-gris-clair/30">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-xs text-gris font-light leading-relaxed space-y-3">
          <p>
            <strong className="text-noir">Move in Paris — spécialiste de la gestion locative meublée à Paris.</strong>{" "}
            Notre agence accompagne les propriétaires bailleurs dans la mise en location de leurs appartements
            auprès d&apos;une clientèle sociétés premium (groupes du CAC 40, expatriés, cadres en relocation, diplomates)
            dans les arrondissements les plus demandés :{" "}
            <Link href="/nos-appartements" className="text-gold hover:text-gold-dark">Paris 1er à 4e</Link>, 7e, 8e (Triangle d&apos;or, Madeleine, Champs-Élysées),
            16e (Trocadéro, Passy, Auteuil, Porte Dauphine), 17e (Batignolles, Monceau, Ternes, Étoile), ainsi que Neuilly-sur-Seine, Levallois-Perret et Boulogne-Billancourt.
          </p>
          <p>
            Nos prestations incluent la mise en location meublée, le bail société Code Civil (art. 1714-1762),
            la gestion opérationnelle complète, le ménage hebdomadaire, l&apos;assistance technique 7j/7,
            le reporting trimestriel et l&apos;optimisation fiscale LMNP. Service 100 % gratuit pour les propriétaires.
          </p>
          <p>
            En savoir plus : <Link href="/proprietaires" className="text-gold hover:text-gold-dark">espace propriétaires</Link> —{" "}
            <Link href="/estimation" className="text-gold hover:text-gold-dark">estimation de loyer</Link> —{" "}
            <Link href="/proposer-mon-appartement" className="text-gold hover:text-gold-dark">proposer mon bien</Link> —{" "}
            <Link href="/nos-appartements" className="text-gold hover:text-gold-dark">nos biens déjà gérés</Link> —{" "}
            <Link href="/faq" className="text-gold hover:text-gold-dark">FAQ</Link> —{" "}
            <Link href="/a-propos" className="text-gold hover:text-gold-dark">l&apos;agence</Link>.
          </p>
        </div>
      </section>
    </>
  );
}

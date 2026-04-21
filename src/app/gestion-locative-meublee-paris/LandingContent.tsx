"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const BENEFITS = [
  {
    num: "01",
    title: "Service 100 % gratuit",
    desc: "Zéro frais de gestion, zéro commission, zéro honoraire. Nous nous rémunérons exclusivement sur la marge dégagée auprès de notre clientèle corporate.",
  },
  {
    num: "02",
    title: "+30 % de revenus",
    desc: "Jusqu'à 55 €/m² hors charges sur les segments premium (8e, 16e, 17e). Notre clientèle entreprise accepte un positionnement haut de gamme.",
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
    title: "Estimation personnalisée",
    desc: "Vous remplissez le formulaire en 30 secondes. Un conseiller vous recontacte sous 24 h ouvrées avec une fourchette de loyer corporate pour votre bien.",
  },
  {
    title: "Visite & ameublement",
    desc: "Nous visitons le bien, identifions les ajustements nécessaires et recommandons la décoration / ameublement pour répondre aux standards corporate.",
  },
  {
    title: "Mise en location",
    desc: "Photos professionnelles, diffusion auprès de notre portefeuille d'entreprises partenaires, sélection du locataire et signature du bail Code Civil.",
  },
  {
    title: "Gestion opérationnelle",
    desc: "Entrées-sorties, ménage hebdomadaire, assistance technique 7j/7, comptabilité mensuelle, versement du loyer net. Reporting trimestriel.",
  },
];

const CORPORATE_LOGOS = [
  "axa", "danone", "linkedin", "engie", "renault", "vinci", "loreal",
  "lvmh", "ocde", "pernod-ricard", "accenture", "dior", "goldman-sachs",
  "sanofi", "technip-energies",
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
      "J'étais sceptique sur le 'zéro frais' mais c'est réel. Pas de commission cachée. L'agence gagne sur sa marge corporate, moi j'ai le loyer net promis.",
  },
];

const FAQ = [
  {
    q: "Combien coûte la gestion locative Move in Paris ?",
    a: "Notre service est 100 % gratuit pour les propriétaires : aucun frais de gestion, aucune commission, aucun honoraire. Nous nous rémunérons exclusivement sur la marge dégagée auprès de notre clientèle corporate — le loyer que vous recevez est celui que nous vous annonçons, net.",
  },
  {
    q: "Quel type de bail signez-vous ?",
    a: "Un bail Code Civil (articles 1714 à 1762 du Code civil) signé directement avec l'entreprise locataire. Ce cadre juridique est prévu pour la location meublée à usage corporate — il permet une grande souplesse contractuelle tout en offrant toutes les garanties du bail d'habitation classique.",
  },
  {
    q: "En combien de temps mon appartement sera-t-il loué ?",
    a: "La plupart de nos biens trouvent preneur en moins de 15 jours. Notre clientèle corporate exprime des besoins en continu : directeurs en mission, cadres en relocation, expatriés, entreprises internationales logeant leurs collaborateurs. Sur certaines périodes de pic (rentrée, début d'année), le délai tombe à 3–5 jours.",
  },
  {
    q: "Mon appartement est-il assuré pendant la location ?",
    a: "Oui, entièrement. Une assurance habitation multirisque couvre le bien sur toute la durée de la location. Le locataire corporate bénéficie également de la couverture responsabilité civile de son employeur.",
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
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    surface: "",
    pieces: "",
    disponibilite: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType: "owner-lead", ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur inconnue");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur");
    }
  }

  function scrollToForm() {
    document.getElementById("owner-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* ========================== HERO ========================== */}
      <section className="relative overflow-hidden bg-noir-deep text-blanc">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: "url('/apartments/hero-salon.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/70 via-noir-deep/60 to-noir-deep/95" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-36 pb-24 md:pt-44 md:pb-32">
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
              <span className="text-gold">location meublée corporate</span> à Paris
            </h1>
            <p className="mt-6 text-lg md:text-xl text-blanc/80 font-light max-w-2xl leading-relaxed">
              +30 % de revenus vs location classique, service 100 % gratuit, clientèle premium
              (L&apos;Oréal, LVMH, AXA, Sanofi, Goldman Sachs).{" "}
              <span className="text-blanc">Loyer payé par l&apos;employeur — zéro impayé.</span>
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

        {/* Trust bar */}
        <div className="relative border-t border-gold/20 bg-noir-deep/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Frais de gestion", value: "0 €" },
              { label: "Revenus vs location classique", value: "+30 %" },
              { label: "Taux d'occupation", value: "95 %+" },
              { label: "Nuitées logées", value: "60 000+" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-serif text-2xl md:text-3xl text-gold">{stat.value}</div>
                <div className="text-[10px] md:text-xs tracking-[0.15em] uppercase text-blanc/50 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== FORM ========================== */}
      <section id="owner-form" className="py-20 bg-blanc-chaud scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Left: form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 bg-blanc p-8 md:p-10 border border-gris-clair/40 shadow-lg"
            >
              <span className="text-gold text-xs tracking-[0.3em] uppercase">
                Estimation gratuite — sans engagement
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-noir mt-3 mb-2">
                Recevez votre fourchette de loyer corporate en 24 h
              </h2>
              <p className="text-sm text-gris font-light mb-6">
                Un conseiller vous recontacte sous 24 h ouvrées.
              </p>

              {status === "success" ? (
                <div className="p-6 bg-gold/10 border-l-4 border-gold">
                  <div className="font-serif text-lg text-noir mb-1">Merci, {form.prenom || "votre demande est bien reçue"}.</div>
                  <p className="text-sm text-gris font-light">
                    Un conseiller Move in Paris vous recontacte sous 24 h ouvrées au{" "}
                    <strong className="text-noir">{form.telephone || "numéro fourni"}</strong>.
                    <br />
                    Besoin de nous joindre tout de suite ? <a href="tel:+33145200603" className="text-gold hover:text-gold-dark">01 45 20 06 03</a>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Prénom *</label>
                      <input
                        type="text" required value={form.prenom}
                        onChange={(e) => update("prenom", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Nom *</label>
                      <input
                        type="text" required value={form.nom}
                        onChange={(e) => update("nom", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Email *</label>
                      <input
                        type="email" required value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Téléphone *</label>
                      <input
                        type="tel" required value={form.telephone}
                        onChange={(e) => update("telephone", e.target.value)}
                        placeholder="06 __ __ __ __"
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Adresse ou quartier du bien *</label>
                    <input
                      type="text" required value={form.adresse}
                      onChange={(e) => update("adresse", e.target.value)}
                      placeholder="Ex : rue de l'Étoile, Paris 17e"
                      className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Surface (m²) *</label>
                      <input
                        type="number" required min={10} value={form.surface}
                        onChange={(e) => update("surface", e.target.value)}
                        placeholder="45"
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Pièces *</label>
                      <select
                        required value={form.pieces}
                        onChange={(e) => update("pieces", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      >
                        <option value="">—</option>
                        <option value="1">Studio / 1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4+">4+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Disponibilité</label>
                      <select
                        value={form.disponibilite}
                        onChange={(e) => update("disponibilite", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none"
                      >
                        <option value="">—</option>
                        <option value="immediat">Immédiate</option>
                        <option value="1mois">Sous 1 mois</option>
                        <option value="3mois">Sous 3 mois</option>
                        <option value="plus">+ de 3 mois</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gris uppercase tracking-[0.15em] mb-1.5">Message (facultatif)</label>
                    <textarea
                      rows={3} value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="État du bien, mobilier déjà présent, contraintes particulières…"
                      className="w-full px-3 py-2.5 border border-gris-clair bg-blanc text-sm focus:border-gold focus:outline-none resize-y"
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-red-500">Erreur : {errorMsg}. Merci de réessayer ou de nous appeler au 01 45 20 06 03.</p>
                  )}

                  <button
                    type="submit" disabled={status === "loading"}
                    className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all ${status === "loading" ? "bg-gris text-blanc cursor-wait" : "bg-gold text-noir-deep hover:bg-gold-light"}`}
                  >
                    {status === "loading" ? "Envoi en cours…" : "Recevoir mon estimation"}
                  </button>
                  <p className="text-[11px] text-gris font-light text-center">
                    Vos données restent confidentielles. Nous ne vendons aucune information.
                  </p>
                </form>
              )}
            </motion.div>

            {/* Right: trust panel */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="bg-noir-deep text-blanc p-8">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="font-serif text-lg">Pourquoi confier dès aujourd&apos;hui ?</div>
                </div>
                <ul className="space-y-3 text-sm text-blanc/80 font-light">
                  <li className="flex gap-2">
                    <span className="text-gold">◆</span>
                    Un conseiller dédié vous rappelle sous <strong className="text-blanc">24 h ouvrées</strong>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gold">◆</span>
                    Fourchette de loyer personnalisée (DRIHL + référence Move in Paris)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gold">◆</span>
                    Sans engagement — vous choisissez après la visite
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gold">◆</span>
                    Délai moyen de mise en location : <strong className="text-blanc">15 jours</strong>
                  </li>
                </ul>
              </div>
              <div className="p-6 border border-gold/30 bg-blanc">
                <div className="text-gold text-xs tracking-[0.3em] uppercase">Google Reviews</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-serif text-3xl text-noir">4.8</span>
                  <div className="flex text-gold">
                    {"★★★★★".split("").map((s, i) => (
                      <span key={i}>{s}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gris mt-2">Avis vérifiés de propriétaires et locataires</p>
              </div>
            </motion.aside>
          </div>
        </div>
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

      {/* ========================== CLIENTÈLE ========================== */}
      <section className="py-16 bg-noir-deep">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-10">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Nos entreprises partenaires</span>
            <h2 className="font-serif text-2xl md:text-3xl text-blanc mt-3">
              Un loyer payé par des entreprises du CAC 40
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 opacity-80">
            {CORPORATE_LOGOS.map((logo) => (
              <div
                key={logo}
                className="aspect-[3/2] flex items-center justify-center bg-blanc/5 border border-blanc/10 p-4 hover:bg-blanc/10 transition-colors"
              >
                <Image
                  src={`/logos/${logo}.svg`}
                  alt={logo}
                  width={80} height={40}
                  className="max-h-10 w-auto opacity-70 brightness-0 invert"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* ========================== TESTIMONIALS ========================== */}
      <section className="py-24 bg-blanc">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Ils nous font confiance</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3 mb-4">Témoignages de propriétaires</h2>
            <div className="h-px w-16 bg-gold mx-auto" />
          </div>
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
            Estimation gratuite
            <br />
            <span className="text-gold">en 30 secondes</span>
          </h2>
          <p className="text-blanc/70 font-light max-w-2xl mx-auto mb-10">
            Remplissez le formulaire ou appelez-nous directement.
            Un conseiller Move in Paris revient vers vous sous 24 h ouvrées
            avec une fourchette de loyer personnalisée.
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
            auprès d&apos;une clientèle corporate premium (groupes du CAC 40, expatriés, cadres en relocation, diplomates)
            dans les arrondissements les plus demandés :{" "}
            <Link href="/nos-appartements" className="text-gold hover:text-gold-dark">Paris 1er à 4e</Link>, 7e, 8e (Triangle d&apos;or, Madeleine, Champs-Élysées),
            16e (Trocadéro, Passy, Auteuil, Porte Dauphine), 17e (Batignolles, Monceau, Ternes, Étoile), ainsi que Neuilly-sur-Seine, Levallois-Perret et Boulogne-Billancourt.
          </p>
          <p>
            Nos prestations incluent la mise en location meublée, le bail Code Civil corporate (art. 1714-1762),
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

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/search/?api=1&query=Move%20in%20Paris%20148%20rue%20de%20la%20Pompe%2075116%20Paris";

type Review = {
  author: string;
  role: string;
  initials: string;
  quote: string;
};

const fiveStarReviews: Review[] = [
  {
    author: "Marie D.",
    role: "DRH, Groupe international",
    initials: "MD",
    quote:
      "Move in Paris a trouvé un appartement pour notre directeur financier en moins de 48h. Professionnalisme et réactivité remarquables.",
  },
  {
    author: "James W.",
    role: "Expatrié, Secteur financier",
    initials: "JW",
    quote:
      "En tant qu'expatrié, j'avais besoin d'un accompagnement complet. L'équipe a géré chaque détail avec une efficacité impressionnante.",
  },
  {
    author: "Philippe R.",
    role: "Propriétaire, Paris 16e",
    initials: "PR",
    quote:
      "Propriétaire depuis 8 ans chez Move in Paris, je n'ai jamais eu à me soucier de la gestion de mon bien. Taux d'occupation optimal.",
  },
  {
    author: "Sophie L.",
    role: "Mobilité internationale",
    initials: "SL",
    quote:
      "Service irréprochable du début à la fin. L'appartement était exactement comme sur les photos, l'accueil parfait. Je recommande à 100%.",
  },
  {
    author: "Thomas B.",
    role: "CFO, Cabinet de conseil",
    initials: "TB",
    quote:
      "Une équipe ultra professionnelle et à l'écoute. Ils ont trouvé la perle rare pour notre VP en 72h. Bravo pour la qualité du service.",
  },
  {
    author: "Isabelle M.",
    role: "Propriétaire, Neuilly",
    initials: "IM",
    quote:
      "Gestion exemplaire. Communication fluide, transparence totale sur les loyers. Je confie mes deux appartements à Move in Paris sans hésiter.",
  },
  {
    author: "Alexandre P.",
    role: "Directeur Général",
    initials: "AP",
    quote:
      "Nous faisons appel à Move in Paris pour tous nos cadres expatriés depuis 3 ans. Zéro souci, toujours des biens de grande qualité.",
  },
  {
    author: "Clara V.",
    role: "Consultante senior",
    initials: "CV",
    quote:
      "Je suis arrivée à Paris pour une mission de 6 mois. L'appartement proposé était magnifique, très bien situé, literie premium. Top !",
  },
  {
    author: "Nicolas H.",
    role: "Banquier d'affaires",
    initials: "NH",
    quote:
      "Service concierge haut de gamme. Check-in personnalisé, réactivité 7j/7, appartement impeccable. Un vrai plus pour s'installer sereinement.",
  },
  {
    author: "Émilie F.",
    role: "RH, Groupe du CAC40",
    initials: "EF",
    quote:
      "Partenaire de confiance pour notre programme de mobilité. Les collaborateurs reviennent systématiquement avec des retours élogieux.",
  },
  {
    author: "David K.",
    role: "Expatrié, Tech",
    initials: "DK",
    quote:
      "Relocation parfaitement orchestrée. L'équipe parle anglais couramment et comprend les attentes des expatriés. Merci pour tout !",
  },
  {
    author: "Caroline T.",
    role: "Propriétaire, Paris 8e",
    initials: "CT",
    quote:
      "Revenus locatifs supérieurs à mes attentes, aucun impayé, bien toujours en parfait état. Le modèle corporate est un vrai gage de sérénité.",
  },
  {
    author: "Julien A.",
    role: "VP Europe",
    initials: "JA",
    quote:
      "Appartement d'exception, service à la hauteur. Move in Paris, c'est la garantie d'une installation rapide et sans accroc à Paris.",
  },
  {
    author: "Laura G.",
    role: "Avocate internationale",
    initials: "LG",
    quote:
      "Accompagnement sur mesure, de la visite à la remise des clés. Le tout dans une ambiance chaleureuse et très pro. Je recommande vivement.",
  },
  {
    author: "Hugo S.",
    role: "Directeur marketing",
    initials: "HS",
    quote:
      "Chaque détail est pensé. La qualité des appartements, l'accueil, le suivi : on sent une vraie exigence. Un standing supérieur à la concurrence.",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#FBBC04">
          <path d="M12 2l2.9 6.9L22 9.7l-5.4 4.7L18.2 22 12 18.3 5.8 22l1.6-7.6L2 9.7l7.1-.8L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleG({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>(fiveStarReviews);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setReviews(shuffle(fiveStarReviews));
    setMounted(true);
  }, []);

  const doubled = [...reviews, ...reviews];

  return (
    <section id="temoignages" className="py-24 bg-noir-deep relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 mb-14">
        {/* Header */}
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gold text-xs tracking-[0.3em] uppercase"
          >
            Ils nous font confiance
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl md:text-5xl text-blanc mt-4 mb-4"
          >
            Avis Google 5 étoiles
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 text-blanc/70 text-sm"
          >
            <GoogleG className="w-5 h-5" />
            <Stars />
            <span className="font-light">
              Tous nos avis clients sont vérifiés sur Google
            </span>
          </motion.div>
        </div>
      </div>

      {/* Scrolling reviews banner */}
      <style>{`
        @keyframes reviews-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .reviews-track {
          animation: reviews-scroll-left 80s linear infinite;
          width: max-content;
        }
        .reviews-track:hover { animation-play-state: paused; }
        .reviews-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .reviews-container::-webkit-scrollbar { display: none; }
        @media (pointer: coarse) {
          .reviews-track { animation: none; }
          .reviews-container { scroll-snap-type: x proximity; }
          .reviews-item { scroll-snap-align: start; }
        }
      `}</style>

      <div className="relative reviews-container" suppressHydrationWarning>
        <div className="flex gap-6 reviews-track px-6">
          {doubled.map((r, i) => (
            <article
              key={`${mounted ? "m" : "s"}-${i}`}
              className="reviews-item flex-shrink-0 w-[320px] md:w-[380px] p-7 bg-blanc/[0.03] border border-blanc/10 hover:border-gold/30 transition-all duration-500 flex flex-col"
              style={{ borderRadius: 10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <Stars />
                <GoogleG className="w-4 h-4" />
              </div>
              <p className="text-blanc/75 leading-relaxed font-light text-sm mb-6 flex-1">
                &ldquo;{r.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-serif text-xs">
                  {r.initials}
                </div>
                <div>
                  <div className="text-blanc text-sm font-medium">{r.author}</div>
                  <div className="text-blanc/40 text-xs">{r.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute top-0 left-0 w-16 md:w-24 h-full bg-gradient-to-r from-noir-deep to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-16 md:w-24 h-full bg-gradient-to-l from-noir-deep to-transparent pointer-events-none z-10" />
      </div>

      {/* Google Reviews CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-14 text-center relative z-10"
      >
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-3 border border-blanc/20 text-blanc text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300"
          style={{ borderRadius: 10 }}
        >
          <GoogleG className="w-5 h-5" />
          Voir tous nos avis Google
        </a>
      </motion.div>
    </section>
  );
}

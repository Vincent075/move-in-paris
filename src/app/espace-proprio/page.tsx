import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Espace Propriétaire · Move in Paris",
  description: "Espace privé réservé aux propriétaires Move in Paris.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function EspaceProprio() {
  return (
    <div className="relative min-h-screen bg-noir-deep flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative max-w-xl text-center">
        <Link href="/" aria-label="Move in Paris">
          <Image
            src="/Logo-gold.png"
            alt="Move in Paris"
            width={280}
            height={90}
            className="h-24 w-auto mx-auto"
            priority
          />
        </Link>

        <div className="text-gold text-xs tracking-[0.3em] uppercase mt-10">
          Espace privé
        </div>
        <h1 className="font-serif text-blanc text-4xl md:text-5xl leading-[1.15] mt-4">
          Espace <span className="text-gold">Propriétaire</span>
        </h1>
        <div className="w-[60px] h-px bg-gold mx-auto mt-6" />

        <p className="text-blanc/60 font-light mt-7 leading-relaxed">
          Suivez vos appartements en toute sérénité : occupation, entretien, documents et interventions, réunis dans un espace sécurisé réservé aux propriétaires Move in Paris.
        </p>
        <p className="text-blanc/40 font-light text-sm mt-4">
          L’accès personnalisé par lien sécurisé envoyé par email ouvre prochainement.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/espace-proprio/demo"
            className="bg-gold text-noir-deep px-10 py-4 text-[13px] tracking-[0.1em] uppercase font-medium hover:bg-gold-light transition-all duration-300"
          >
            Découvrir la démonstration
          </Link>
          <a
            href="mailto:guillaume@move-in-paris.com"
            className="border border-gold text-gold px-10 py-[15px] text-[13px] tracking-[0.1em] uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
          >
            Écrire à Guillaume
          </a>
        </div>

        <Link
          href="/"
          className="inline-block text-blanc/40 hover:text-gold transition-colors text-xs tracking-wider uppercase mt-12"
        >
          Retour au site
        </Link>
      </div>
    </div>
  );
}

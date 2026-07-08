import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/espace-proprio/LoginForm";
import { readSession } from "@/lib/espace-proprio/auth";

export const metadata: Metadata = {
  title: "Espace Propriétaire · Move in Paris",
  description: "Espace privé réservé aux propriétaires Move in Paris.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function EspaceProprio({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  // Déjà connecté → directement dans l'espace
  const session = await readSession().catch(() => null);
  if (session) redirect("/espace-proprio/mon-espace");

  const { erreur } = await searchParams;

  return (
    <div className="relative min-h-screen bg-noir-deep flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative w-full max-w-xl text-center">
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

        <div className="mt-10">
          <LoginForm initialError={erreur} />
        </div>

        <div className="flex items-center gap-4 mt-12 mb-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-blanc/30 text-xs tracking-[0.2em] uppercase">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Link
            href="/espace-proprio/demo"
            className="border border-gold text-gold px-10 py-[15px] text-[13px] tracking-[0.1em] uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
          >
            Découvrir la démonstration
          </Link>
          <a
            href="mailto:guillaume@move-in-paris.com"
            className="text-blanc/50 hover:text-gold transition-colors px-6 py-[15px] text-[13px] tracking-[0.1em] uppercase"
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

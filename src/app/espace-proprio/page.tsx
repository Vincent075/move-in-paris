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
    <div className="min-h-screen bg-blanc flex flex-col">
      {/* Bandeau header noir fin, comme le site */}
      <div className="bg-noir-deep">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-[72px] flex items-center justify-between">
          <Link href="/" aria-label="Move in Paris">
            <Image
              src="/Logo-gold.png"
              alt="Move in Paris"
              width={200}
              height={64}
              className="h-14 w-auto"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs tracking-wider uppercase text-blanc/70 hover:text-gold transition-colors"
          >
            Retour au site
          </Link>
        </div>
      </div>
      <div className="h-0.5 bg-gold" />

      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-blanc-chaud/60">
        <div className="w-full max-w-xl text-center">
          <div className="text-gold text-xs tracking-[0.3em] uppercase">
            Espace privé
          </div>
          <h1 className="font-serif text-noir text-4xl md:text-5xl leading-[1.15] mt-4">
            Espace <span className="text-gold">Propriétaire</span>
          </h1>
          <div className="w-[60px] h-px bg-gold mx-auto mt-6" />

          <p className="text-gris font-light mt-7 leading-relaxed">
            Suivez vos appartements en toute sérénité : occupation, entretien, documents et interventions, réunis dans un espace sécurisé réservé aux propriétaires Move in Paris.
          </p>

          <div className="mt-10 bg-white border border-gris-clair p-8 text-left shadow-sm">
            <LoginForm initialError={erreur} />
          </div>

          <div className="flex items-center gap-4 mt-10 mb-2">
            <div className="flex-1 h-px bg-gris-clair" />
            <span className="text-gris/60 text-xs tracking-[0.2em] uppercase">ou</span>
            <div className="flex-1 h-px bg-gris-clair" />
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
              className="text-gris hover:text-gold transition-colors px-6 py-[15px] text-[13px] tracking-[0.1em] uppercase"
            >
              Écrire à Guillaume
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function CorporateCallout() {
  return (
    <section className="py-16 md:py-20 bg-blanc-chaud">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Pour les entreprises</span>
            <h2 className="font-serif text-3xl md:text-4xl text-noir mt-4 mb-6 leading-tight">
              Louer au nom de votre société
            </h2>
            <p className="text-gris font-light leading-relaxed mb-6">
              Vous êtes <strong className="text-noir">DRH, Office Manager ou dirigeant</strong> et cherchez à loger un ou plusieurs collaborateurs à Paris ? Move in Paris propose une <strong className="text-noir">location meublée société</strong> clé en main : bail au nom de votre entreprise (SAS, SARL, SCI, association), facture mensuelle déductible IS, gestion 100 % déléguée.
            </p>
            <ul className="space-y-2 mb-8 text-gris font-light">
              <li className="flex gap-3"><span className="text-gold">◆</span><span>Bail société sécurisé, signature électronique en 5 minutes</span></li>
              <li className="flex gap-3"><span className="text-gold">◆</span><span>Coût 30 à 60 % inférieur à un hôtel équivalent</span></li>
              <li className="flex gap-3"><span className="text-gold">◆</span><span>+200 entreprises clientes — L&apos;Oréal, LVMH, AXA, Goldman Sachs</span></li>
            </ul>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/location-meublee-entreprise"
                className="inline-block px-8 py-3 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
              >
                Location meublée société
              </Link>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 border border-noir/20 text-noir text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300"
              >
                Demander un devis
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden order-first md:order-last">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/apartments/salon-bibliotheque.jpg')" }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-noir-deep/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-blanc">
              <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">Service corporate</div>
              <div className="font-serif text-xl md:text-2xl">Plus de 117 000 nuits gérées pour les entreprises</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

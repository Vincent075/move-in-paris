import Link from "next/link";

const STARS = "★★★★★";

export default function TrustStripB2B() {
  return (
    <section className="bg-noir-deep py-10 border-b border-blanc/10">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
          <div>
            <div className="font-serif text-3xl md:text-4xl text-gold mb-1">+200</div>
            <div className="text-blanc/60 text-xs uppercase tracking-wider">Entreprises clientes</div>
          </div>
          <div>
            <div className="font-serif text-3xl md:text-4xl text-gold mb-1">117 000+</div>
            <div className="text-blanc/60 text-xs uppercase tracking-wider">Nuits gérées</div>
          </div>
          <div>
            <div className="font-serif text-3xl md:text-4xl text-gold mb-1">95 %</div>
            <div className="text-blanc/60 text-xs uppercase tracking-wider">Taux d&apos;occupation</div>
          </div>
          <div>
            <div className="font-serif text-3xl md:text-4xl text-gold mb-1">
              4,8<span className="text-xl">/5</span>
            </div>
            <div className="text-blanc/60 text-xs uppercase tracking-wider">
              <span className="text-gold mr-1" aria-hidden>{STARS}</span>
              61 avis Google
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-blanc/10">
          <p className="text-blanc/40 text-xs uppercase tracking-[0.25em] text-center mb-6">
            Ils nous font confiance
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-blanc/60 font-serif text-base md:text-lg">
            <span>L&apos;Oréal</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>LVMH</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>AXA</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>Sanofi</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>Goldman Sachs</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>BNP Paribas</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>Deloitte</span>
            <span className="hidden md:inline text-blanc/20">·</span>
            <span>EY</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-block text-gold text-sm uppercase tracking-wider border-b border-gold/40 pb-1 hover:border-gold transition-colors"
          >
            Demander un devis société →
          </Link>
        </div>
      </div>
    </section>
  );
}

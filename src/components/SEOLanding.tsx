import Link from "next/link";
import type { ReactNode } from "react";

export type SEOLandingFAQ = { q: string; a: string };

export type SEOLandingProps = {
  eyebrow: string;
  intro: string;
  sections: { title: string; body: ReactNode }[];
  highlights?: { title: string; text: string }[];
  faqs: SEOLandingFAQ[];
  ctaTitle: string;
  ctaText: string;
  ctaHref?: string;
  ctaLabel?: string;
  relatedLinks?: { href: string; label: string }[];
};

export default function SEOLanding({
  eyebrow,
  intro,
  sections,
  highlights,
  faqs,
  ctaTitle,
  ctaText,
  ctaHref = "/contact",
  ctaLabel = "Nous contacter",
  relatedLinks,
}: SEOLandingProps) {
  return (
    <>
      <section className="bg-blanc py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <p className="text-gold uppercase text-xs tracking-[0.25em] mb-4">{eyebrow}</p>
          <p className="text-gris text-lg md:text-xl font-light leading-relaxed mb-12">{intro}</p>

          {highlights && highlights.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {highlights.map((h) => (
                <div key={h.title} className="p-6 border border-gris-clair/50 bg-blanc-chaud">
                  <h3 className="font-serif text-lg text-noir mb-2">{h.title}</h3>
                  <p className="text-gris text-sm font-light leading-relaxed">{h.text}</p>
                </div>
              ))}
            </div>
          )}

          {sections.map((s) => (
            <div key={s.title} className="mb-12">
              <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">{s.title}</h2>
              <div className="h-px w-12 bg-gold mb-6" />
              <div className="text-gris font-light leading-relaxed space-y-4 [&_p]:mb-4 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-noir [&_h3]:mt-8 [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-gris [&_strong]:text-noir [&_a]:text-gold [&_a]:underline">
                {s.body}
              </div>
            </div>
          ))}

          {faqs.length > 0 && (
            <div className="mt-16 mb-12">
              <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">Questions fréquentes</h2>
              <div className="h-px w-12 bg-gold mb-8" />
              <div className="space-y-6">
                {faqs.map((f) => (
                  <div key={f.q} className="border-b border-gris-clair/50 pb-6">
                    <h3 className="font-serif text-lg text-noir mb-3">{f.q}</h3>
                    <p className="text-gris font-light leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-noir-deep py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-blanc mb-4">{ctaTitle}</h2>
          <p className="text-blanc/70 mb-8 font-light">{ctaText}</p>
          <Link
            href={ctaHref}
            className="inline-block px-8 py-3 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      {relatedLinks && relatedLinks.length > 0 && (
        <section className="bg-blanc-chaud py-12">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <p className="text-gold uppercase text-xs tracking-[0.25em] mb-4">Pour aller plus loin</p>
            <div className="flex flex-wrap gap-3">
              {relatedLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-block px-5 py-2.5 border border-noir-deep/15 text-noir text-sm hover:border-gold hover:text-gold transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export function buildFaqLd(faqs: SEOLandingFAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

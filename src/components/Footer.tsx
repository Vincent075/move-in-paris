"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-noir-deep py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Image
              src="/Logo-gold.png"
              alt="Move in Paris"
              width={420}
              height={156}
              className="h-40 w-auto mb-4"
            />
            <p className="text-blanc/40 text-sm font-light leading-relaxed max-w-xs">
              Agence parisienne spécialisée dans la location meublée corporate
              et l&apos;accompagnement d&apos;expatriés.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">Navigation</h4>
            <div className="space-y-3">
              {[
                { href: "/nos-appartements", label: "Nos appartements" },
                { href: "/a-propos", label: "À propos" },
                { href: "/proprietaires", label: "Propriétaires" },
                { href: "/proposer-mon-appartement", label: "Proposer un bien" },
                { href: "/contact", label: "Contact" },
                { href: "/faq", label: "FAQ" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-blanc/50 hover:text-gold transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">Contact</h4>
            <div className="space-y-3 text-sm text-blanc/50">
              <p>26, rue de l&apos;Étoile</p>
              <p>75017 Paris</p>
              <p className="text-gold">+33 1 45 20 06 03</p>
              <p>contact@move-in-paris.com</p>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">Horaires</h4>
            <div className="space-y-2 text-sm text-blanc/50">
              <p>Lundi - Vendredi : 9h - 19h</p>
              <p>Samedi : sur rendez-vous</p>
              <p>Dimanche : fermé</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-blanc/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-blanc/30 text-xs">
            &copy; {new Date().getFullYear()} Move in Paris. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-blanc/30 text-xs">
            <Link href="/mentions-legales" className="hover:text-gold transition-colors">Mentions légales</Link>
            <Link href="/cgu" className="hover:text-gold transition-colors">CGU</Link>
            <Link href="/politique-de-confidentialite" className="hover:text-gold transition-colors">Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

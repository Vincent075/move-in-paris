"use client";

import Link from "next/link";
import Image from "next/image";
import LogoLink from "./LogoLink";
import { useT } from "@/i18n/LocaleProvider";

export default function Footer() {
  const t = useT();
  const navLinks = [
    { href: "/nos-appartements", label: t("nav.apartments") },
    { href: "/a-propos", label: t("nav.about") },
    { href: "/proprietaires", label: t("nav.owners") },
    { href: "/proposer-mon-appartement", label: t("nav.proposeProperty") },
    { href: "/estimation", label: t("nav.estimation") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/faq", label: t("nav.faq") },
  ];
  return (
    <footer className="bg-noir-deep py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <LogoLink className="inline-block mb-4">
              <Image
                src="/Logo-gold.png"
                alt="Move in Paris"
                width={420}
                height={156}
                className="h-40 w-auto"
              />
            </LogoLink>
            <p className="text-blanc/40 text-sm font-light leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">{t("footer.navigation")}</h4>
            <div className="space-y-3">
              {navLinks.map((link) => (
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
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">{t("footer.contact")}</h4>
            <div className="space-y-3 text-sm text-blanc/50">
              <p>26, rue de l&apos;Étoile</p>
              <p>75017 Paris</p>
              <p className="text-gold">+33 1 45 20 06 03</p>
              <p>contact@move-in-paris.com</p>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-blanc text-xs tracking-[0.2em] uppercase mb-6">{t("footer.hours")}</h4>
            <div className="space-y-2 text-sm text-blanc/50">
              <p>{t("footer.hoursWeek")}</p>
              <p>{t("footer.hoursSat")}</p>
              <p>{t("footer.hoursSun")}</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-blanc/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-blanc/30 text-xs">
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex gap-6 text-blanc/30 text-xs">
            <Link href="/mentions-legales" className="hover:text-gold transition-colors">{t("footer.legal")}</Link>
            <Link href="/cgu" className="hover:text-gold transition-colors">{t("footer.cgu")}</Link>
            <Link href="/politique-de-confidentialite" className="hover:text-gold transition-colors">{t("footer.privacy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

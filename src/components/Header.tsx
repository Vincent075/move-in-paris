"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoLink from "./LogoLink";
import { useLocale, useT } from "@/i18n/LocaleProvider";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const t = useT();
  const { locale, setLocale } = useLocale();

  const navLinks = [
    { href: "/nos-appartements", label: t("nav.apartments") },
    { href: "/a-propos", label: t("nav.about") },
    { href: "/proprietaires", label: t("nav.owners") },
    { href: "/estimation", label: t("nav.estimation") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/contact", label: t("nav.contact") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerBg = isHome && !scrolled
    ? "bg-transparent"
    : "bg-noir-deep/95 backdrop-blur-xl shadow-2xl shadow-black/20";

  const LocaleSwitcher = ({ dark = false }: { dark?: boolean }) => {
    const baseCls = dark
      ? "text-blanc/60 hover:text-gold"
      : "text-blanc/70 hover:text-white";
    const activeCls = "text-gold font-semibold";
    return (
      <div className={`flex items-center gap-1.5 text-xs tracking-wider uppercase ${dark ? "" : "ml-3"}`}>
        <button
          onClick={() => locale !== "fr" && setLocale("fr")}
          className={locale === "fr" ? activeCls : baseCls}
          aria-label="Français"
        >
          FR
        </button>
        <span className="text-blanc/20">|</span>
        <button
          onClick={() => locale !== "en" && setLocale("en")}
          className={locale === "en" ? activeCls : baseCls}
          aria-label="English"
        >
          EN
        </button>
      </div>
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerBg}`}
        style={{ borderRadius: 0 }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-24">
            <LogoLink className="flex items-center group">
              <Image
                src="/Logo-gold.png"
                alt="Move in Paris"
                width={640}
                height={640}
                className="h-32 w-auto transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </LogoLink>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center">
              <div className="flex items-center bg-white/5 backdrop-blur-sm rounded-full px-2 py-1.5 border border-white/10">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-xs tracking-wide uppercase transition-all duration-300 rounded-full ${
                      pathname === link.href
                        ? "bg-gold text-noir-deep font-semibold"
                        : "text-blanc/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <Link
                href="/proposer-mon-appartement"
                className="ml-4 px-6 py-2.5 bg-gradient-to-r from-gold to-gold-light text-noir-deep text-sm tracking-wider uppercase font-semibold rounded-full hover:shadow-lg hover:shadow-gold/25 transition-all duration-300 hover:scale-105"
              >
                {t("nav.proposeCta")}
              </Link>
              <LocaleSwitcher />
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/10"
              aria-label={t("nav.menu")}
              style={{ borderRadius: '50%' }}
            >
              <div className="flex flex-col gap-1.5">
                <span className={`w-5 h-0.5 bg-gold transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`w-5 h-0.5 bg-gold transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`w-5 h-0.5 bg-gold transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Full Screen Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-noir-deep/98 backdrop-blur-xl flex flex-col"
            style={{ borderRadius: 0 }}
          >
            {/* Close button */}
            <div className="flex justify-between items-center px-6 py-6">
              <LogoLink onNavigate={() => setMobileOpen(false)}>
                <Image src="/Logo-gold.png" alt="Move in Paris" width={200} height={200} className="h-16 w-auto" />
              </LogoLink>
              <div className="flex items-center gap-4">
                <LocaleSwitcher dark />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-gold text-xl"
                  style={{ borderRadius: '50%' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="flex-1 flex flex-col justify-center px-8 gap-2">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-4 py-5 px-6 rounded-2xl transition-all ${
                      pathname === link.href
                        ? "bg-gold/10 border border-gold/20 text-gold"
                        : "text-blanc/70 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className={`w-1.5 h-8 rounded-full ${pathname === link.href ? "bg-gold" : "bg-white/10"}`} />
                    <span className="font-serif text-2xl">{link.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="px-8 pb-10">
              <Link
                href="/proposer-mon-appartement"
                onClick={() => setMobileOpen(false)}
                className="block w-full py-4 bg-gradient-to-r from-gold to-gold-light text-noir-deep text-center font-semibold tracking-wider uppercase rounded-2xl"
              >
                {t("nav.proposeCta")}
              </Link>
              <div className="flex items-center justify-center gap-6 mt-6 text-blanc/30 text-xs">
                <a href="tel:+33145200603" className="hover:text-gold transition-colors">+33 1 45 20 06 03</a>
                <span>•</span>
                <a href="mailto:contact@move-in-paris.com" className="hover:text-gold transition-colors">contact@move-in-paris.com</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

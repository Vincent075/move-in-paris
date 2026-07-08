"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PortalData } from "@/lib/espace-proprio/mock";
import EventNotifier from "./EventNotifier";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const dayKey = (y: number, m: number, d: number) => y * 10000 + (m + 1) * 100 + d;
const isoToKey = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return dayKey(y, m - 1, d);
};

const EYEBROW = "text-gold text-xs tracking-[0.3em] uppercase";
const GHOST_BTN =
  "font-sans rounded-none! border border-gris-clair px-[18px] py-[10px] text-[11px] tracking-[0.1em] uppercase text-gris hover:border-gold hover:text-gold transition-all duration-300 whitespace-nowrap cursor-pointer bg-transparent";

type Props = {
  data: PortalData;
  /** null pour masquer le bandeau */
  bannerLabel?: string | null;
  chipName?: string;
  lastLoginLabel?: string | null;
  /** si fourni, remplace "Retour au site" par un lien de déconnexion */
  logoutHref?: string;
};

export default function DemoDashboard({
  data,
  bannerLabel = "Espace de démonstration · données fictives",
  chipName = "M. Philippe de Vasselot",
  lastLoginLabel,
  logoutHref,
}: Props) {
  /* ----- toast ----- */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  /* ----- calendrier ----- */
  const [cal, setCal] = useState({ y: 2026, m: 6 }); // juillet 2026 (mois riche en données démo)
  const [todayK, setTodayK] = useState<number | null>(null);
  useEffect(() => {
    const now = new Date();
    setTodayK(dayKey(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const staysK = useMemo(
    () => data.stays.map((s) => [isoToKey(s.arrival), isoToKey(s.departure)] as const),
    [data.stays],
  );
  const cleaningsK = useMemo(() => data.cleaningDays.map(isoToKey), [data.cleaningDays]);
  const isOcc = (k: number) => staysK.some(([a, b]) => k >= a && k <= b);

  const moveMonth = (delta: number) =>
    setCal(({ y, m }) => {
      const nm = m + delta;
      if (nm < 0) return { y: y - 1, m: 11 };
      if (nm > 11) return { y: y + 1, m: 0 };
      return { y, m: nm };
    });

  const firstDow = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7; // lundi = 0
  const nbDays = new Date(cal.y, cal.m + 1, 0).getDate();

  /* ----- interventions par année ----- */
  const intYears = useMemo(
    () =>
      [...new Set(data.interventions.map((i) => i.dateLabel.trim().split(" ").pop() || ""))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [data.interventions],
  );
  const [intYear, setIntYear] = useState("");
  const activeIntYear = intYear || intYears[0] || "";
  const filteredInterventions = data.interventions.filter(
    (i) => (i.dateLabel.trim().split(" ").pop() || "") === activeIntYear,
  );

  const currentStay = data.stays.find((s) => s.current);
  const pastStays = data.stays.filter((s) => !s.current && isoToKey(s.departure) < isoToKey("2026-07-01"));

  return (
    <div className="bg-blanc text-noir font-sans font-light">
      {/* Bandeau contextuel */}
      {bannerLabel && (
        <div className="bg-gold text-noir-deep text-center px-4 py-[7px] text-[11px] tracking-[0.2em] uppercase font-medium">
          {bannerLabel}
        </div>
      )}

      {/* Header portail */}
      <header className="sticky top-0 z-50 bg-noir-deep/95 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-[80px] flex items-center justify-between gap-5">
          <Link href="/" aria-label="Move in Paris">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={200} height={64} className="h-16 w-auto" />
          </Link>
          <div className="hidden md:block text-blanc/70 text-xs tracking-[0.05em] text-right">
            Espace propriétaire
            <span className="block text-gold text-[13px] font-medium">{chipName}</span>
          </div>
          {logoutHref ? (
            <a
              href={logoutHref}
              className="text-xs tracking-wider uppercase text-blanc/70 hover:text-gold transition-colors whitespace-nowrap"
            >
              Se déconnecter
            </a>
          ) : (
            <Link
              href="/"
              className="text-xs tracking-wider uppercase text-blanc/70 hover:text-gold transition-colors whitespace-nowrap"
            >
              Retour au site
            </Link>
          )}
        </div>
      </header>

      {/* Hero clair */}
      <div className="relative bg-blanc-chaud overflow-hidden py-16 border-b border-gris-clair/60">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className={EYEBROW}>Espace propriétaire</div>
          <h1 className="font-serif text-noir text-4xl md:text-5xl lg:text-[54px] leading-[1.15] mt-3">
            Bonjour <span className="text-gold">{data.ownerName}</span>,
          </h1>
          <p className="text-gris mt-4 text-[17px] max-w-[560px]">
            Voici les dernières nouvelles de vos appartements, suivis avec le plus grand soin par notre équipe.
          </p>
          {lastLoginLabel && (
            <p className="text-gris/70 text-xs mt-3 tracking-[0.05em]">
              Dernière connexion : {lastLoginLabel} · vos accès sont tracés et protégés
            </p>
          )}
          <div className="w-[60px] h-px bg-gold mt-5" />

          <div className="flex flex-nowrap gap-3.5 mt-9 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {data.apartments.map((apt, i) => (
              <button
                key={apt.id}
                onClick={() =>
                  showToast(i === 0 ? "Appartement déjà affiché" : "Le contenu basculerait sur cet appartement")
                }
                className={`snap-start shrink-0 text-left px-6 py-4 border transition-all duration-300 cursor-pointer ${
                  i === 0
                    ? "border-gold bg-white shadow-sm"
                    : "border-gris-clair bg-white/60 hover:border-gold"
                }`}
              >
                <span className="block text-gold text-[11px] tracking-[0.2em] uppercase mb-1">{apt.ref}</span>
                <span className="font-serif text-noir text-[17px] whitespace-nowrap">{apt.shortAddress}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Vue d'ensemble */}
        <section className="pt-20">
          {data.apartments[0]?.photo ? (
            <div className="relative overflow-hidden border border-gris-clair/50">
              {/* eslint-disable-next-line @next/next/no-img-element -- photos Airtable distantes au go-live, hors allowlist next/image */}
              <img
                src={data.apartments[0].photo}
                alt={data.apartments[0].shortAddress}
                className="w-full h-[240px] md:h-[340px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-noir-deep/90 via-noir-deep/35 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 md:p-9">
                <div className={EYEBROW}>Votre bien en un coup d’œil</div>
                <h2 className="font-serif text-blanc text-3xl md:text-4xl mt-2">{data.apartments[0].shortAddress}</h2>
                <div className="text-blanc/60 text-[11px] tracking-[0.2em] uppercase mt-2.5">{data.apartments[0].ref}</div>
              </div>
            </div>
          ) : (
            <>
              <div className={EYEBROW}>Votre bien en un coup d’œil</div>
              <h2 className="font-serif text-3xl md:text-4xl mt-3">{data.apartments[0]?.shortAddress}</h2>
              <div className="w-[60px] h-px bg-gold mt-5" />
            </>
          )}
          <div className="mt-8 flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 lg:pb-0 lg:grid lg:grid-cols-4">
            {data.glance.map((g) => (
              <div
                key={g.k}
                className="snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-auto bg-blanc-chaud/50 border border-gris-clair/50 hover:bg-blanc-chaud hover:border-gold/30 transition-all duration-500 p-8"
              >
                <span className="block text-gris text-[11px] tracking-[0.2em] uppercase mb-3">{g.k}</span>
                <div className="font-serif text-[21px] leading-[1.35]">{g.v}</div>
                <div className="text-gris text-[13px] mt-2">{g.s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Calendrier */}
        <section className="pt-20">
          <div className={EYEBROW}>Calendrier</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Les prochaines semaines</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />

          <div className="bg-blanc-chaud/50 border border-gris-clair/50 p-6 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => moveMonth(-1)}
                  aria-label="Mois précédent"
                  className="w-[42px] h-[42px] rounded-none! border border-gris-clair text-gold font-serif text-xl flex items-center justify-center hover:border-gold hover:bg-gold/10 transition-all cursor-pointer bg-transparent"
                >
                  ‹
                </button>
                <h3 className="font-serif italic text-2xl min-w-[210px] text-center">
                  {MONTHS[cal.m]} {cal.y}
                </h3>
                <button
                  onClick={() => moveMonth(1)}
                  aria-label="Mois suivant"
                  className="w-[42px] h-[42px] rounded-none! border border-gris-clair text-gold font-serif text-xl flex items-center justify-center hover:border-gold hover:bg-gold/10 transition-all cursor-pointer bg-transparent"
                >
                  ›
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-[11px] tracking-[0.05em] uppercase text-gris">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-3 rounded-full! bg-gold inline-block" />Occupé
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-[13px] h-[13px] bg-blanc border border-gris-clair inline-block" />Libre
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full! bg-noir-deep inline-block" />Ménage complet
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-x-1.5 gap-y-3">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="text-center text-[10px] tracking-[0.15em] uppercase text-gris py-2">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`out-${i}`} />
              ))}
              {Array.from({ length: nbDays }).map((_, i) => {
                const d = i + 1;
                const k = dayKey(cal.y, cal.m, d);
                const dow = (firstDow + d - 1) % 7;
                const occ = isOcc(k);
                const men = cleaningsK.includes(k);
                const prevOcc = occ && d > 1 && dow > 0 && isOcc(dayKey(cal.y, cal.m, d - 1));
                const nextOcc = occ && d < nbDays && dow < 6 && isOcc(dayKey(cal.y, cal.m, d + 1));
                return (
                  <div
                    key={d}
                    className={`relative h-[74px] sm:h-24 bg-blanc border border-gris-clair ${
                      k === todayK ? "outline outline-2 -outline-offset-2 outline-noir-deep" : ""
                    }`}
                  >
                    <span className="absolute top-2 right-[11px] text-[13px] text-noir font-medium">{d}</span>
                    {occ ? (
                      <div
                        className={`absolute bottom-[11px] h-[30px] bg-gold z-[1] flex items-center justify-center text-noir-deep text-[10px] tracking-[0.1em] uppercase font-semibold whitespace-nowrap overflow-hidden rounded-full! ${
                          prevOcc ? "left-[-4px] rounded-l-none!" : "left-[5px]"
                        } ${nextOcc ? "right-[-4px] rounded-r-none!" : "right-[5px]"}`}
                      >
                        {prevOcc ? "" : "Occupé"}
                      </div>
                    ) : men ? (
                      <div className="absolute bottom-[13px] inset-x-0 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.08em] uppercase text-noir-deep font-medium">
                        <span className="w-1.5 h-1.5 rounded-full! bg-noir-deep inline-block" />
                        Ménage
                      </div>
                    ) : (
                      <div className="absolute bottom-[13px] inset-x-0 text-center text-[10px] tracking-[0.08em] uppercase text-gris">
                        Libre
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-gris italic text-sm mt-6">{data.calendarNote}</p>
          </div>
        </section>

        {/* Occupants */}
        <section className="pt-20">
          <div className={EYEBROW}>Occupation en cours</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Qui séjourne chez vous</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />

          {currentStay && (
            <div className="bg-blanc-chaud/50 border border-gris-clair/50 hover:border-gold/30 transition-all duration-500 p-8 md:p-10 flex flex-wrap items-center justify-between gap-8">
              <div className="grid grid-cols-[auto_1fr] gap-x-9 gap-y-3">
                <span className="text-gris text-[11px] tracking-[0.2em] uppercase self-center">Occupants</span>
                <span className="text-[15px] font-normal">
                  <strong className="font-semibold">{currentStay.occupantName}</strong>
                </span>
                <span className="text-gris text-[11px] tracking-[0.2em] uppercase self-center">Date d’arrivée</span>
                <span className="text-[15px] font-semibold">{currentStay.arrivalLabel}</span>
                <span className="text-gris text-[11px] tracking-[0.2em] uppercase self-center">Date de départ</span>
                <span className="text-[15px] font-semibold">{currentStay.departureLabel}</span>
                <span className="text-gris text-[11px] tracking-[0.2em] uppercase self-center">Durée</span>
                <span className="text-[15px]">
                  <strong className="font-semibold">{currentStay.nights} nuits</strong> · 2 mois
                </span>
              </div>
              <button
                onClick={() => showToast(`Un email pré-rempli (réf. ${currentStay.ref}) partirait à votre Property Manager`)}
                className={GHOST_BTN}
              >
                Poser une question
              </button>
            </div>
          )}

          <div className="mt-14">
            <div className={EYEBROW}>Historique</div>
            <h3 className="font-serif text-2xl mt-2 mb-6">Les séjours précédents</h3>
            <div className="border border-gris-clair/50 overflow-hidden overflow-x-auto">
              <table className="w-full bg-blanc-chaud/50 text-sm">
                <thead>
                  <tr className="bg-blanc-chaud">
                    {["Référence", "Date d’arrivée", "Date de départ", "Durée", "Occupants"].map((h) => (
                      <th key={h} className="text-left px-7 py-[18px] text-[10px] tracking-[0.2em] uppercase text-gris font-normal border-b border-gris-clair">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pastStays.map((s) => (
                    <tr key={s.ref}>
                      <td className="px-7 py-[18px] border-b border-gris-clair/60">{s.ref}</td>
                      <td className="px-7 py-[18px] border-b border-gris-clair/60">{s.arrivalLabel}</td>
                      <td className="px-7 py-[18px] border-b border-gris-clair/60">{s.departureLabel}</td>
                      <td className="px-7 py-[18px] border-b border-gris-clair/60">{s.nights} nuits</td>
                      <td className="px-7 py-[18px] border-b border-gris-clair/60">
                        {s.occupants} personne{s.occupants > 1 ? "s" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-baseline gap-2 text-gris text-xs mt-4">
              <span className="text-gold text-[10px]">◆</span>
              Conformément au RGPD, l’identité des occupants n’est affichée que pendant leur séjour. L’historique est conservé de façon anonymisée : dates, durée et nombre de personnes.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="pt-20">
          <div className={EYEBROW}>La vie de votre bien</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Activité récente</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
            {data.timeline.map((ev, i) => (
              <div
                key={ev.title + ev.dateLabel}
                className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[31.5%] bg-blanc-chaud/50 border border-gris-clair/50 hover:border-gold/30 hover:bg-blanc-chaud transition-all duration-500 p-7 flex flex-col"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="w-10 h-10 shrink-0 border border-gold/30 text-gold font-serif text-sm flex items-center justify-center">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="text-gold text-[11px] tracking-[0.2em] uppercase text-right">{ev.dateLabel}</div>
                </div>
                <div className="font-serif text-lg mt-5">{ev.title}</div>
                <p className="text-gris text-sm mt-1.5 flex-1">{ev.desc}</p>
                <button
                  onClick={() =>
                    showToast(
                      ev.ref
                        ? `Email pré-rempli (réf. ${ev.ref}) vers votre Property Manager`
                        : "Le document s’ouvrirait dans la visionneuse",
                    )
                  }
                  className={`${GHOST_BTN} mt-6 self-start`}
                >
                  {ev.ref ? "Question" : "Voir"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bandeau stats soin */}
      <div className="bg-noir-deep py-16 mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4 gap-10 text-center">
          {[
            { n: data.stats.avgStay, l: "Durée moyenne de séjour" },
            { n: String(data.stats.staysSince2024), l: "Séjours accueillis depuis 2024" },
            { n: String(data.stats.cleanings2026), l: "Ménages complets en 2026" },
            { n: String(data.stats.interventions2026), l: "Interventions closes en 2026" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-serif text-4xl md:text-5xl text-gold font-bold">{s.n}</div>
              <div className="text-blanc/50 text-[13px] tracking-[0.1em] uppercase mt-1.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Documents */}
        <section className="pt-20">
          <div className={EYEBROW}>Vos documents</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Classés, chiffrés, disponibles</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />

          <div className="flex gap-2 mb-5">
            {["2026", "2025", "2024"].map((year, i) => (
              <button
                key={year}
                onClick={() =>
                  showToast(i === 0 ? "Démonstration · année 2026 déjà affichée" : `Démonstration · basculerait sur les documents ${year}`)
                }
                className={`rounded-full! px-[22px] py-[10px] text-xs tracking-[0.1em] border transition-all cursor-pointer ${
                  i === 0
                    ? "bg-gold border-gold text-noir-deep font-semibold"
                    : "border-gris-clair text-gris hover:border-gold hover:text-gold-dark bg-transparent"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="bg-blanc-chaud/50 border border-gris-clair/50 overflow-hidden">
            {data.documents.map((doc, i) => (
              <div
                key={doc.name}
                className={`flex items-center gap-5 px-7 py-[22px] ${i < data.documents.length - 1 ? "border-b border-gris-clair/60" : ""}`}
              >
                <span className="text-gold text-[11px] shrink-0">◆</span>
                <div>
                  <div className="font-serif text-[17px]">
                    {doc.name}
                    {doc.isNew && (
                      <span className="bg-gold text-noir-deep rounded-full! text-[9px] tracking-[0.15em] uppercase font-semibold px-2.5 py-[3px] ml-3 align-middle inline-block">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <div className="text-gris text-xs mt-0.5">{doc.meta}</div>
                </div>
                <div className="ml-auto hidden md:flex gap-2.5">
                  <button onClick={() => showToast("Le PDF s’ouvrirait dans la page, sans téléchargement")} className={GHOST_BTN}>
                    Consulter
                  </button>
                  {doc.transmittable && (
                    <button onClick={() => showToast("V2 · lien sécurisé valable 72 h pour votre comptable")} className={GHOST_BTN}>
                      Transmettre
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="flex items-baseline gap-2 text-gris text-xs mt-4">
            <span className="text-gold text-[10px]">◆</span>
            Vos documents sont stockés chiffrés (AES-256) sur un serveur sécurisé hébergé en France, conformément au RGPD.
          </p>
        </section>

        {/* Interventions */}
        <section className="pt-20">
          <div className={EYEBROW}>Entretien</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Interventions techniques</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />
          <div className="flex gap-2 mb-5">
            {intYears.map((year) => (
              <button
                key={year}
                onClick={() => setIntYear(year)}
                className={`rounded-full! px-[22px] py-[10px] text-xs tracking-[0.1em] border transition-all cursor-pointer ${
                  year === activeIntYear
                    ? "bg-gold border-gold text-noir-deep font-semibold"
                    : "border-gris-clair text-gris hover:border-gold hover:text-gold-dark bg-transparent"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="bg-blanc-chaud/50 border border-gris-clair/50 overflow-hidden">
            {filteredInterventions.length === 0 && (
              <p className="px-7 py-[22px] text-gris text-sm italic">Aucune intervention cette année : votre bien se porte bien.</p>
            )}
            {filteredInterventions.map((it, i) => (
              <div
                key={it.ref}
                className={`flex items-center gap-5 px-7 py-[22px] ${i < filteredInterventions.length - 1 ? "border-b border-gris-clair/60" : ""}`}
              >
                <span className="text-gold text-[11px] shrink-0">◆</span>
                <div className="min-w-0">
                  <div className="font-serif text-[17px]">{it.nature}</div>
                  <div className="text-gris text-xs mt-0.5">
                    {it.dateLabel} · {it.provider} · réf. {it.ref}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2.5 shrink-0">
                  <span className="rounded-full! border border-gold/40 text-gold-dark bg-gold/10 text-[10px] tracking-[0.1em] uppercase font-medium px-3.5 py-[5px] whitespace-nowrap inline-block">
                    {it.status}
                  </span>
                  <button
                    onClick={() => showToast(`Email pré-rempli (réf. ${it.ref}) vers votre Property Manager`)}
                    className={`${GHOST_BTN} hidden md:block`}
                  >
                    Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signalement */}
        <section id="signaler" className="pt-20">
          <div className={EYEBROW}>Votre bien</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Une information à nous transmettre ?</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-6" />
          <p className="text-gris font-light max-w-[620px] mb-8">
            Changement de code d’accès, coupure d’eau ou d’électricité, intervention prévue dans l’immeuble : prévenez-nous en quelques secondes, notre équipe prend le relais.
          </p>
          <EventNotifier
            demo={!logoutHref}
            apartmentLabel={`${data.apartments[0]?.ref || ""} · ${data.apartments[0]?.shortAddress || ""}`}
            onDemoSubmit={showToast}
          />
        </section>

        {/* Contact équipe */}
        <section className="pt-20 pb-20">
          <div className={EYEBROW}>Notre équipe</div>
          <h2 className="font-serif text-3xl md:text-4xl mt-3">Une question ? On s’occupe de tout.</h2>
          <div className="w-[60px] h-px bg-gold mt-5 mb-10" />
          <div className="relative bg-noir-deep p-9 md:p-14 flex flex-wrap items-center gap-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative w-24 h-24 shrink-0 rounded-full! border border-gold/50 bg-gold/10 text-gold font-serif text-3xl flex items-center justify-center">
              ◆
            </div>
            <div className="relative">
              <h3 className="font-serif text-blanc text-[26px]">L’équipe Move in Paris</h3>
              <div className="text-gold text-[11px] tracking-[0.3em] uppercase mt-1.5">
                Property management · à votre service
              </div>
              <p className="text-blanc/60 text-sm mt-3.5 max-w-[400px]">
                On veille sur vos appartements comme si c’étaient les nôtres. On vous répond du lundi au vendredi, de 9 h à 19 h.
              </p>
            </div>
            <div className="relative ml-auto flex flex-col gap-3 w-full md:w-auto">
              <a
                href="mailto:guillaume@move-in-paris.com"
                className="bg-gold text-noir-deep text-center px-10 py-4 text-[13px] tracking-[0.1em] uppercase font-medium hover:bg-gold-light transition-all duration-300"
              >
                Nous écrire
              </a>
              <a
                href="tel:+33145200603"
                className="border border-gold text-gold text-center px-10 py-[15px] text-[13px] tracking-[0.1em] uppercase hover:bg-gold hover:text-noir-deep transition-all duration-300"
              >
                +33 1 45 20 06 03
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* CTA confier un autre bien */}
      <div className="relative bg-noir-deep py-24 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className={EYEBROW}>Vous possédez un autre bien ?</div>
          <h2 className="font-serif text-blanc text-3xl md:text-[42px] mt-3">
            Confiez-le à <span className="text-gold">Move in Paris</span>
          </h2>
          <div className="w-[60px] h-px bg-gold mx-auto mt-5" />
          <p className="text-blanc/60 max-w-[540px] mx-auto mt-5 mb-9">
            Vos coordonnées sont déjà connues : il ne vous reste qu’à nous décrire le bien. Nous revenons vers vous sous 48 h avec une estimation personnalisée.
          </p>
          <Link
            href="/proposer-mon-appartement"
            className="inline-block bg-gold text-noir-deep px-10 py-4 text-[13px] tracking-[0.1em] uppercase font-medium hover:bg-gold-light transition-all duration-300"
          >
            Confier un autre bien
          </Link>
        </div>
      </div>

      {/* Toast */}
      <div
        aria-live="polite"
        className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-[200] bg-noir-deep text-blanc border border-gold/50 px-7 py-[15px] text-xs max-w-[88vw] text-center transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n/LocaleProvider";

type LegSummary = {
  durationMinutes: number;
  distanceMeters: number;
  steps?: string[];
};

type DirectionsResponse = {
  transit: LegSummary | null;
  bicycling: LegSummary | null;
  driving: LegSummary | null;
  error?: string;
};

type Mode = "transit" | "bicycling" | "driving";

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts: {
              bounds?: { north: number; south: number; east: number; west: number };
              componentRestrictions?: { country: string | string[] };
              fields?: string[];
              types?: string[];
            },
          ) => {
            addListener: (event: string, cb: () => void) => void;
            getPlace: () => { formatted_address?: string; name?: string };
          };
        };
      };
    };
    __mipGmapsLoading?: Promise<void>;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__mipGmapsLoading) return window.__mipGmapsLoading;
  window.__mipGmapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&language=fr&region=FR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gmaps_load_failed"));
    document.head.appendChild(script);
  });
  return window.__mipGmapsLoading;
}

function ModeCard({
  mode,
  icon,
  label,
  data,
  loading,
  delay,
}: {
  mode: Mode;
  icon: React.ReactNode;
  label: string;
  data: LegSummary | null | undefined;
  loading: boolean;
  delay: number;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-blanc border border-gris-clair/60 p-5 sm:p-6 flex flex-col items-center text-center min-h-[168px]"
    >
      <div className="w-11 h-11 flex items-center justify-center rounded-full bg-gold/10 text-gold mb-3">
        {icon}
      </div>
      <span className="text-[10px] tracking-[0.22em] uppercase text-gris font-medium">{label}</span>

      {loading ? (
        <div className="mt-3 flex flex-col items-center gap-2 w-full">
          <div className="h-7 w-20 bg-gris-clair/70 animate-pulse" />
          <div className="h-3 w-14 bg-gris-clair/50 animate-pulse" />
        </div>
      ) : data ? (
        <>
          <div className="font-serif text-3xl sm:text-[2rem] leading-none text-noir mt-3 tabular-nums">
            {data.durationMinutes} <span className="text-base text-gris font-sans font-light">min</span>
          </div>
          {mode === "transit" && data.steps && data.steps.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
              {data.steps.slice(0, 4).map((step, i) => (
                <span
                  key={`${step}-${i}`}
                  className="px-2 py-0.5 bg-noir-deep text-blanc text-[10px] tracking-wider font-medium"
                >
                  {step}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 text-sm text-gris font-light">{t("trip.notAvailable")}</div>
      )}
    </motion.div>
  );
}

const ICON_TRANSIT = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="3" width="14" height="16" rx="3" />
    <path d="M5 13h14" />
    <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" />
    <path d="M8 19l-2 2M16 19l2 2" />
  </svg>
);

const ICON_BIKE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5.5" cy="17" r="3.5" />
    <circle cx="18.5" cy="17" r="3.5" />
    <path d="M8.5 17l3.5-8h3M12 9l3 5h3M14.5 9h-2" />
  </svg>
);

const ICON_CAR = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 16V11l2-5h10l2 5v5" />
    <rect x="3" y="11" width="18" height="6" rx="1.5" />
    <circle cx="7.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export default function TripCalculator({ origin }: { origin: string }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState<string>("");
  const [data, setData] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autocompleteReady, setAutocompleteReady] = useState(true);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      setAutocompleteReady(true);
      return;
    }
    let cancelled = false;
    loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places) {
          setAutocompleteReady(true);
          return;
        }
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "fr" },
          fields: ["formatted_address", "name"],
          bounds: { north: 49.25, south: 48.12, east: 3.56, west: 1.44 },
          types: ["geocode", "establishment"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const address = place.formatted_address ?? place.name ?? "";
          if (address) {
            setDestination(address);
            if (inputRef.current) inputRef.current.value = address;
          }
        });
        setAutocompleteReady(true);
      })
      .catch(() => {
        setAutocompleteReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCalculate(e?: React.FormEvent) {
    e?.preventDefault();
    const dest = inputRef.current?.value?.trim() || destination.trim();
    if (!dest) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ origin, destination: dest });
      const res = await fetch(`/api/directions?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "no_route_found" ? "no_route" : "generic");
        setData(null);
      } else {
        const body = (await res.json()) as DirectionsResponse;
        setData(body);
      }
    } catch {
      setError("generic");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const hasResults = loading || data;

  return (
    <div>
      <h2 className="font-serif text-2xl text-noir mb-4">{t("trip.title")}</h2>
      <div className="h-px w-12 bg-gold mb-6" />

      <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gris"
          >
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={t("trip.placeholder")}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-3 font-medium tracking-wider uppercase text-xs whitespace-nowrap transition-all duration-300 ${
            loading
              ? "bg-gris-clair text-gris cursor-not-allowed"
              : "bg-noir-deep text-blanc hover:bg-gold hover:text-noir-deep"
          }`}
        >
          {loading ? t("trip.calculating") : t("trip.calculate")}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-blanc-chaud border-l-2 border-gold px-4 py-3 text-sm text-noir mb-6"
          >
            {error === "no_route" ? t("trip.errorNoRoute") : t("trip.errorGeneric")}
          </motion.div>
        )}

        {hasResults && !error && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          >
            <ModeCard
              mode="transit"
              icon={ICON_TRANSIT}
              label={t("trip.transit")}
              data={data?.transit}
              loading={loading}
              delay={0}
            />
            <ModeCard
              mode="bicycling"
              icon={ICON_BIKE}
              label={t("trip.bicycling")}
              data={data?.bicycling}
              loading={loading}
              delay={0.08}
            />
            <ModeCard
              mode="driving"
              icon={ICON_CAR}
              label={t("trip.driving")}
              data={data?.driving}
              loading={loading}
              delay={0.16}
            />
          </motion.div>
        )}

        {!hasResults && !error && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gris font-light italic"
          >
            {t("trip.hint")}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

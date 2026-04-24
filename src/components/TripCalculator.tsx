"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text?: string };
};

function ModeCard({
  mode,
  icon,
  label,
  data,
  loading,
  delay,
  selected,
  onSelect,
}: {
  mode: Mode;
  icon: React.ReactNode;
  label: string;
  data: LegSummary | null | undefined;
  loading: boolean;
  delay: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const t = useT();
  const clickable = !!onSelect && !!data && !loading;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={clickable ? onSelect : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(); } } : undefined}
      className={`bg-blanc px-4 py-4 sm:p-6 flex flex-row sm:flex-col items-center sm:text-center gap-4 sm:gap-0 snap-start shrink-0 w-[260px] sm:w-auto transition-colors ${
        selected ? "border-2 border-gold" : "border border-gris-clair/60"
      } ${clickable ? "cursor-pointer hover:border-gold" : ""}`}
    >
      <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full bg-gold/10 text-gold sm:mb-3">
        {icon}
      </div>
      <div className="flex flex-col items-start sm:items-center sm:text-center">
      <span className="text-[10px] tracking-[0.22em] uppercase text-gris font-medium">{label}</span>

      {loading ? (
        <div className="mt-2 sm:mt-3 flex flex-col sm:items-center gap-2 w-full">
          <div className="h-6 sm:h-7 w-20 bg-gris-clair/70 animate-pulse" />
          <div className="h-3 w-14 bg-gris-clair/50 animate-pulse" />
        </div>
      ) : data ? (
        <>
          <div className="font-serif text-2xl sm:text-[2rem] leading-none text-noir mt-1 sm:mt-3 tabular-nums">
            {data.durationMinutes} <span className="text-sm sm:text-base text-gris font-sans font-light">min</span>
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
      </div>
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

export default function TripCalculator({
  origin,
  onTripCalculated,
}: {
  origin: string;
  onTripCalculated?: (destination: string, mode: Mode) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [destination, setDestination] = useState<string>("");
  const [data, setData] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode>("transit");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!showPredictions) return;
    function updatePosition() {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showPredictions, predictions]);

  useEffect(() => {
    if (!showPredictions) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPredictions]);

  function fetchPredictions(input: string) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const trimmed = input.trim();
    setSearchedQuery(trimmed);
    if (!trimmed) {
      setPredictions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      try {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(trimmed)}`);
        if (seq !== requestSeqRef.current) return;
        setSearching(false);
        if (!res.ok) {
          setPredictions([]);
          return;
        }
        const body = (await res.json()) as { predictions?: Prediction[]; error?: string };
        if (seq !== requestSeqRef.current) return;
        if (body.error) {
          console.warn("[TripCalculator] places-autocomplete error:", body.error);
        }
        setPredictions((body.predictions ?? []).slice(0, 5));
        setHighlightedIndex(-1);
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        setSearching(false);
        setPredictions([]);
        console.warn("[TripCalculator] autocomplete fetch failed:", err);
      }
    }, 180);
  }

  function selectPrediction(pred: Prediction) {
    setDestination(pred.description);
    if (inputRef.current) inputRef.current.value = pred.description;
    setPredictions([]);
    setShowPredictions(false);
  }

  async function handleCalculate(e?: React.FormEvent) {
    e?.preventDefault();
    const dest = inputRef.current?.value?.trim() || destination.trim();
    if (!dest) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ origin, destination: dest });
      const res = await fetch(`/api/directions?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "no_route_found" ? "no_route" : "generic");
        setData(null);
        return;
      }
      const body = (await res.json()) as DirectionsResponse;
      setData(body);
      // Pick the first available mode for the map (prefer user's current selection)
      const preferred = body[selectedMode] ? selectedMode : body.transit ? "transit" : body.bicycling ? "bicycling" : body.driving ? "driving" : null;
      if (preferred) {
        onTripCalculated?.(dest, preferred);
      }
    } catch {
      setError("generic");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMode(mode: Mode, dest: string) {
    setSelectedMode(mode);
    onTripCalculated?.(dest, mode);
  }

  const hasResults = loading || data;

  return (
    <div>
      <h2 className="font-serif text-2xl text-noir mb-4">{t("trip.title")}</h2>
      <div className="h-px w-12 bg-gold mb-6" />

      <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div ref={wrapperRef} className="relative flex-1">
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gris z-10 pointer-events-none"
          >
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={t("trip.placeholder")}
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value;
              setDestination(v);
              fetchPredictions(v);
              setShowPredictions(true);
            }}
            onFocus={() => {
              if (predictions.length > 0) setShowPredictions(true);
            }}
            onKeyDown={(e) => {
              if (!showPredictions || predictions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((i) => Math.min(i + 1, predictions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                selectPrediction(predictions[highlightedIndex]);
              } else if (e.key === "Escape") {
                setShowPredictions(false);
              }
            }}
            className="w-full pl-10 pr-4 py-3 border border-gris-clair bg-blanc text-noir text-base sm:text-sm focus:border-gold focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full sm:w-auto px-6 py-3 font-medium tracking-wider uppercase text-xs whitespace-nowrap transition-all duration-300 ${
            loading
              ? "bg-gris-clair text-gris cursor-not-allowed"
              : "bg-noir-deep text-blanc hover:bg-gold hover:text-noir-deep"
          }`}
        >
          {loading ? t("trip.calculating") : t("trip.calculate")}
        </button>
      </form>

      {/* Predictions dropdown rendered via portal to body to avoid any CSS clipping */}
      {mounted && showPredictions && dropdownRect &&
        createPortal(
          <div
            data-trip-dropdown
            style={{
              position: "absolute",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <AnimatePresence>
              {predictions.length > 0 ? (
                <motion.ul
                  key="list"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white shadow-2xl shadow-noir-deep/25 border border-gris-clair/40 max-h-[280px] overflow-y-auto py-1.5"
                >
                  {predictions.map((pred, i) => {
                    const highlighted = i === highlightedIndex;
                    return (
                      <li
                        key={pred.place_id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectPrediction(pred);
                        }}
                        onMouseEnter={() => setHighlightedIndex(i)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                          highlighted ? "bg-blanc-chaud" : "hover:bg-blanc-chaud"
                        }`}
                      >
                        <div className="text-noir font-medium truncate">
                          {pred.structured_formatting?.main_text ?? pred.description}
                        </div>
                        {pred.structured_formatting?.secondary_text && (
                          <div className="text-gris text-xs truncate">
                            {pred.structured_formatting.secondary_text}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </motion.ul>
              ) : searching && searchedQuery.length > 0 ? (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white shadow-2xl shadow-noir-deep/25 border border-gris-clair/40 px-4 py-3 text-sm text-gris italic"
                >
                  {t("trip.searching")}
                </motion.div>
              ) : !searching && searchedQuery.length > 1 ? (
                <motion.div
                  key="noresults"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white shadow-2xl shadow-noir-deep/25 border border-gris-clair/40 px-4 py-3 text-sm text-gris"
                >
                  {t("trip.noSuggestion")}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>,
          document.body,
        )
      }

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
            className="trip-modes-row flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-x-visible scrollbar-hide pb-1"
          >
            <ModeCard
              mode="transit"
              icon={ICON_TRANSIT}
              label={t("trip.transit")}
              data={data?.transit}
              loading={loading}
              delay={0}
              selected={selectedMode === "transit"}
              onSelect={() => handleSelectMode("transit", destination || inputRef.current?.value || "")}
            />
            <ModeCard
              mode="bicycling"
              icon={ICON_BIKE}
              label={t("trip.bicycling")}
              data={data?.bicycling}
              loading={loading}
              delay={0.08}
              selected={selectedMode === "bicycling"}
              onSelect={() => handleSelectMode("bicycling", destination || inputRef.current?.value || "")}
            />
            <ModeCard
              mode="driving"
              icon={ICON_CAR}
              label={t("trip.driving")}
              data={data?.driving}
              loading={loading}
              delay={0.16}
              selected={selectedMode === "driving"}
              onSelect={() => handleSelectMode("driving", destination || inputRef.current?.value || "")}
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

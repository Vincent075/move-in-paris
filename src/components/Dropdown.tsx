"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export type DropdownOption = { value: string; label: string };

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  flush = true,
}: {
  label: string;
  value: string;
  options: string[] | DropdownOption[];
  onChange: (v: string) => void;
  flush?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const normalized: DropdownOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const currentLabel = normalized.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const wrapperClass = flush
    ? "relative flex-1 border-b md:border-b-0 md:border-r border-gris-clair/20"
    : "relative border border-gris-clair bg-blanc";

  const buttonClass = flush
    ? "w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 group"
    : "w-full px-4 py-3 text-left flex items-center justify-between gap-3 group";

  return (
    <div ref={rootRef} className={wrapperClass}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={buttonClass}
      >
        <span className="flex flex-col min-w-0">
          <span className="text-[10px] text-gold-dark uppercase tracking-[0.15em] font-semibold mb-1.5">
            {label}
          </span>
          <span className="text-noir text-sm font-medium truncate">{currentLabel}</span>
        </span>
        <span className="text-gris-clair group-hover:text-gold transition-colors shrink-0">
          <Chevron open={open} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white shadow-2xl shadow-noir-deep/20 border border-gris-clair/40 max-h-[320px] overflow-y-auto py-1.5"
          >
            {normalized.map((opt) => {
              const selected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-5 py-2.5 text-sm cursor-pointer transition-colors ${
                    selected
                      ? "bg-gold/10 text-noir font-medium"
                      : "text-noir hover:bg-blanc-chaud"
                  }`}
                >
                  {opt.label}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

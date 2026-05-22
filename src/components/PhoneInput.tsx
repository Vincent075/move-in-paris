"use client";

import { useState } from "react";
import { validatePhone } from "@/lib/validate-phone";

/**
 * Shared phone input with format validation and visible red error state.
 *
 * Behaviour :
 *   - default border = current input border
 *   - on blur OR when the user has touched the field, an invalid number
 *     paints the border red and surfaces a human-readable reason below
 *   - parent gets an `onValidityChange(valid)` callback so it can disable
 *     its submit button when the number is wrong
 *
 * Used on /contact, /estimation, /proposer-mon-appartement and on every
 * apartment detail page contact form. Centralising the rule prevents the
 * "tenant left a wrong number" leak we hit in production.
 */
export default function PhoneInput({
  id,
  name = "telephone",
  value,
  onChange,
  required = false,
  className = "",
  labelClass = "",
  label,
  placeholder = "06 12 34 56 78 ou +33 6 12 34 56 78",
  baseClass,
  errorClass = "border-red-500 focus:border-red-600",
  helpClass = "text-xs mt-2 leading-relaxed",
  onValidityChange,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  labelClass?: string;
  label?: string;
  placeholder?: string;
  baseClass: string;
  errorClass?: string;
  helpClass?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [touched, setTouched] = useState(false);

  const trimmed = (value || "").trim();
  const check = validatePhone(trimmed);
  // If the field is optional AND empty, we consider it valid (don't block).
  const effectivelyValid =
    !required && trimmed.length === 0 ? true : check.valid;
  const showError = touched && !effectivelyValid;

  // Propagate validity up
  if (onValidityChange) {
    // Defer to next tick to avoid React warnings about setState during render
    queueMicrotask(() => onValidityChange(effectivelyValid));
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (touched && effectivelyValid) {
            /* user is fixing the number — keep showing red until valid */
          }
        }}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? `${id}-error` : undefined}
        className={`${baseClass} ${showError ? errorClass : ""}`}
      />
      {showError ? (
        <p id={`${id}-error`} className={`${helpClass} text-red-600`}>
          {check.reason || "Numéro invalide."}
        </p>
      ) : (
        <p className={`${helpClass} text-gris/70 italic`}>
          Format français (06…) ou international avec indicatif (+33, +44…).
        </p>
      )}
    </div>
  );
}

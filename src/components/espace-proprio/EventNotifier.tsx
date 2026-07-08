"use client";

import { useState } from "react";
import { NOTIFY_CATEGORIES } from "@/lib/espace-proprio/notify-categories";

type Props = {
  /** mode démonstration : aucun email réel, message pédagogique */
  demo?: boolean;
  apartmentLabel: string;
  onDemoSubmit?: (msg: string) => void;
};

export default function EventNotifier({ demo = false, apartmentLabel, onDemoSubmit }: Props) {
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || state === "sending") return;

    if (demo) {
      onDemoSubmit?.("Démonstration · un email partirait immédiatement à votre Property Manager");
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/espace-proprio/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, date, message, apartment: apartmentLabel }),
      });
      const json = (await res.json()) as { ok: boolean };
      setState(json.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="bg-blanc-chaud/50 border border-gold/40 p-8">
        <div className="text-gold-dark text-xs tracking-[0.2em] uppercase font-medium mb-2">
          Bien reçu
        </div>
        <p className="text-noir font-light text-[15px] leading-relaxed max-w-[560px]">
          Votre signalement a été transmis à Guillaume, votre Property Manager. Il revient vers vous rapidement par email.
        </p>
        <button
          onClick={() => {
            setState("idle");
            setCategory("");
            setDate("");
            setMessage("");
          }}
          className="font-sans rounded-none! border border-gris-clair px-[18px] py-[10px] text-[11px] tracking-[0.1em] uppercase text-gris hover:border-gold hover:text-gold transition-all duration-300 mt-6 cursor-pointer bg-transparent"
        >
          Envoyer un autre signalement
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-blanc-chaud/50 border border-gris-clair/50 p-8">
      <div className="text-gris text-[11px] tracking-[0.2em] uppercase mb-4">
        De quoi s’agit-il ?
      </div>
      <div className="flex flex-wrap gap-2">
        {NOTIFY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full! px-5 py-[10px] text-xs tracking-[0.05em] border transition-all cursor-pointer ${
              category === c
                ? "bg-gold border-gold text-noir-deep font-semibold"
                : "border-gris-clair text-gris hover:border-gold hover:text-gold-dark bg-white/60"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[220px_1fr] gap-5 mt-7">
        <div>
          <label htmlFor="notify-date" className="block text-gris text-[11px] tracking-[0.2em] uppercase mb-2.5">
            Date concernée
          </label>
          <input
            id="notify-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-gris-clair px-4 py-3.5 text-noir font-light text-[15px] focus:outline-none focus:border-gold transition-colors"
          />
          <p className="text-gris/70 font-light text-xs mt-2">Optionnelle</p>
        </div>
        <div>
          <label htmlFor="notify-message" className="block text-gris text-[11px] tracking-[0.2em] uppercase mb-2.5">
            Précisions
          </label>
          <textarea
            id="notify-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex. : le digicode passera à 4482B le 15 juillet"
            className="w-full bg-white border border-gris-clair px-4 py-3.5 text-noir font-light text-[15px] placeholder:text-gris/50 focus:outline-none focus:border-gold transition-colors resize-y"
          />
        </div>
      </div>

      {state === "error" && (
        <p className="text-gris font-light text-sm mt-4 border border-gold/40 bg-gold/10 px-4 py-3">
          L’envoi n’a pas abouti. Réessayez dans une minute, ou écrivez directement à guillaume@move-in-paris.com.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 mt-7">
        <button
          type="submit"
          disabled={!category || state === "sending"}
          className="bg-gold text-noir-deep px-10 py-4 text-[13px] tracking-[0.1em] uppercase font-medium hover:bg-gold-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {state === "sending" ? "Envoi en cours" : "Prévenir Guillaume"}
        </button>
        <p className="text-gris font-light text-xs max-w-[320px]">
          Votre signalement part par email à votre Property Manager, qui vous répond directement.
        </p>
      </div>
    </form>
  );
}

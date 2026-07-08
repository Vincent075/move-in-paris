"use client";

import { useState } from "react";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error] = useState(initialError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "sending") return;
    setState("sending");
    try {
      await fetch("/api/espace-proprio/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // réponse neutre dans tous les cas
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="border border-gold/50 bg-gold/10 px-7 py-6">
        <div className="text-gold-dark text-xs tracking-[0.2em] uppercase mb-2 font-medium">Email envoyé</div>
        <p className="text-noir font-light text-sm leading-relaxed">
          Si votre adresse est associée à un espace propriétaire, un lien d’accès sécurisé vient de vous être envoyé. Il est valable 15 minutes : pensez à vérifier vos courriers indésirables.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {error === "lien-expire" && (
        <p className="border border-gold/50 bg-gold/10 text-noir font-light text-sm px-5 py-3 mb-5">
          Ce lien d’accès a expiré ou a déjà été utilisé. Saisissez votre email pour en recevoir un nouveau.
        </p>
      )}
      <label htmlFor="portal-email" className="block text-gris text-xs tracking-[0.2em] uppercase mb-3">
        Votre adresse email
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="portal-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="flex-1 bg-blanc border border-gris-clair px-5 py-4 text-noir placeholder:text-gris/50 font-light text-[15px] focus:outline-none focus:border-gold transition-colors"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="bg-gold text-noir-deep px-8 py-4 text-[13px] tracking-[0.1em] uppercase font-medium hover:bg-gold-light transition-all duration-300 disabled:opacity-60 whitespace-nowrap cursor-pointer"
        >
          {state === "sending" ? "Envoi en cours" : "Recevoir mon lien"}
        </button>
      </div>
      <p className="text-gris font-light text-xs mt-4">
        Aucun mot de passe : vous recevez un lien de connexion sécurisé par email, valable 15 minutes.
      </p>
    </form>
  );
}

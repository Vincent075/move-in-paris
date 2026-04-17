"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type ContactItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  cta?: string;
  external?: boolean;
};

const contactInfo: ContactItem[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: "Adresse",
    value: "26 rue de l'Étoile, 75017 Paris",
    href: "https://www.google.com/maps/search/?api=1&query=26+rue+de+l%27Etoile+75017+Paris",
    cta: "Voir sur la carte",
    external: true,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    label: "Téléphone",
    value: "+33 1 45 20 06 03",
    href: "tel:+33145200603",
    cta: "Appeler maintenant",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    label: "Email",
    value: "contact@move-in-paris.com",
    href: "mailto:contact@move-in-paris.com",
    cta: "Envoyer un email",
  },
];

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      formType: "contact",
      prenom: (form.elements.namedItem("prenom") as HTMLInputElement).value,
      nom: (form.elements.namedItem("nom") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      telephone: (form.elements.namedItem("telephone") as HTMLInputElement).value,
      profil: (form.elements.namedItem("profil") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };
    try {
      await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setSent(true);
      form.reset();
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <section id="contact" className="py-28 bg-blanc-chaud">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-gold text-xs tracking-[0.3em] uppercase">Parlons de votre projet</motion.span>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.1 }} className="font-serif text-4xl md:text-5xl text-noir mt-4 mb-8">Contactez-nous</motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }} className="text-gris font-light leading-relaxed mb-12 max-w-md">
              Que vous soyez propriétaire ou à la recherche d&apos;un logement pour vos collaborateurs, notre équipe est à votre écoute.
            </motion.p>
            <div className="space-y-4">
              {contactInfo.map((info, i) => {
                const externalProps = info.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <motion.a
                    key={info.label}
                    href={info.href}
                    {...externalProps}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="group flex items-center gap-4 p-4 bg-blanc border border-gris-clair/50 hover:border-gold hover:shadow-lg hover:shadow-noir-deep/5 transition-all duration-300"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gold/10 text-gold group-hover:bg-gold group-hover:text-noir-deep transition-all duration-300" style={{ borderRadius: 10 }}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gris uppercase tracking-[0.15em] font-semibold">{info.label}</div>
                      <div className="text-noir font-medium truncate">{info.value}</div>
                      {info.cta && (
                        <div className="text-[11px] text-gold mt-0.5 uppercase tracking-wider font-medium group-hover:underline">
                          {info.cta} →
                        </div>
                      )}
                    </div>
                  </motion.a>
                );
              })}
            </div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.5 }} className="mt-12 aspect-[16/9] bg-gris-clair overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2623.5!2d2.295!3d48.877!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z26+Rue+de+l'%C3%89toile%2C+75017+Paris!5e0!3m2!1sfr!2sfr!4v1"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title="Move in Paris - Localisation" />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.3 }} className="bg-blanc p-10 lg:p-12 border border-gris-clair/50">
            <h3 className="font-serif text-2xl text-noir mb-8">Envoyez-nous un message</h3>
            {sent ? (
              <div className="text-center py-12">
                <div className="text-gold text-4xl mb-4">✓</div>
                <h4 className="font-serif text-xl text-noir mb-2">Message envoyé !</h4>
                <p className="text-gris text-sm">Nous vous répondrons dans les plus brefs délais.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-gold text-sm hover:text-gold-dark transition-colors">
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Prénom</label>
                    <input name="prenom" type="text" required className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Nom</label>
                    <input name="nom" type="text" required className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Téléphone</label>
                  <input name="telephone" type="tel" className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Vous êtes</label>
                  <select name="profil" className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors">
                    <option value="">Sélectionnez...</option>
                    <option value="entreprise">Entreprise / RH</option>
                    <option value="expatrie">Expatrié</option>
                    <option value="proprietaire">Propriétaire</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Message</label>
                  <textarea name="message" rows={4} required className="w-full px-4 py-3 border border-gris-clair bg-transparent text-noir focus:border-gold focus:outline-none transition-colors resize-none" />
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all duration-300 ${loading ? "bg-gris text-blanc" : "bg-gold text-noir-deep hover:bg-gold-light"}`}>
                  {loading ? "Envoi en cours..." : "Envoyer le message"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

export default function SubmitForm() {
  return (
    <section className="py-20 bg-blanc">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-5 gap-16">
          {/* Left - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Formulaire proprietaire</span>
            <h2 className="font-serif text-3xl text-noir mt-3 mb-6">
              Louez votre <span className="text-gold">appartement</span>
            </h2>
            <div className="space-y-4 text-gris font-light leading-relaxed text-sm">
              <p>
                Vous souhaitez mettre votre bien en location meublée corporate ? Complétez le formulaire ci-contre
                et notre équipe vous recontactera rapidement.
              </p>
              <p>
                <strong className="text-noir font-medium">Critères requis :</strong>
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">•</span>
                  Appartement disponible pour une durée minimum de 12 mois
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">•</span>
                  Bien situé à Paris ou en proche banlieue ouest
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">•</span>
                  Appartement meublé ou à meubler
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">•</span>
                  Bon état général et conformité technique
                </li>
              </ul>
            </div>

            <div className="mt-10 p-6 bg-blanc-chaud border border-gris-clair/50">
              <h3 className="font-serif text-lg text-noir mb-3">Besoin d&apos;aide ?</h3>
              <p className="text-gris text-sm font-light mb-3">
                Contactez-nous directement :
              </p>
              <p className="text-noir font-medium">+33 1 45 20 06 03</p>
              <p className="text-gold text-sm">contact@move-in-paris.com</p>
            </div>
          </motion.div>

          {/* Right - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <form className="bg-blanc-chaud border border-gris-clair/50 p-8 lg:p-10 space-y-6">
              <h3 className="font-serif text-2xl text-noir mb-2">Vos informations</h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Civilité</label>
                  <select className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
                    <option value="">Sélectionnez</option>
                    <option value="mr">Monsieur</option>
                    <option value="mme">Madame</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Prénom</label>
                  <input type="text" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Nom</label>
                  <input type="text" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Email</label>
                  <input type="email" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Téléphone</label>
                  <input type="tel" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="pt-4 border-t border-gris-clair/50">
                <h3 className="font-serif text-2xl text-noir mb-4">Votre appartement</h3>
              </div>

              <div>
                <label className="block text-xs text-gris uppercase tracking-wider mb-2">Adresse du bien</label>
                <input type="text" placeholder="Numéro, rue, code postal, ville" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Surface (m²)</label>
                  <input type="number" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Nb de pièces</label>
                  <select className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
                    <option value="">Sélectionnez</option>
                    <option value="1">Studio</option>
                    <option value="2">2 pièces</option>
                    <option value="3">3 pièces</option>
                    <option value="4">4 pièces</option>
                    <option value="5">5 pièces+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Étage</label>
                  <input type="text" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Le bien est</label>
                  <select className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
                    <option value="">Sélectionnez</option>
                    <option value="meuble">Déjà meublé</option>
                    <option value="a-meubler">À meubler</option>
                    <option value="partiellement">Partiellement meublé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Disponibilité</label>
                  <input type="date" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gris uppercase tracking-wider mb-2">Description / Commentaires</label>
                <textarea
                  rows={4}
                  placeholder="Décrivez votre bien, ses atouts, vos attentes..."
                  className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" id="cgu" className="mt-1 accent-[#B88B58]" />
                <label htmlFor="cgu" className="text-xs text-gris leading-relaxed">
                  J&apos;accepte les conditions générales d&apos;utilisation et la politique relative aux données personnelles (RGPD).
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
              >
                Envoyer ma demande
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

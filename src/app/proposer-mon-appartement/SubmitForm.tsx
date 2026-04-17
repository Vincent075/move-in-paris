"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SubmitForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photoFiles.length;
    const filesToProcess = files.slice(0, remaining);
    if (filesToProcess.length === 0) return;
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = (h * maxSize) / w; w = maxSize; }
            else { w = (w * maxSize) / h; h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, { type: "image/jpeg" });
              setPhotoFiles((prev) => [...prev, compressed]);
              setPhotoPreviews((prev) => [...prev, canvas.toDataURL("image/jpeg", 0.7)]);
            }
          }, "image/jpeg", 0.7);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;

    const formData = new FormData();
    formData.append("formType", "proposer");
    formData.append("civilite", (form.elements.namedItem("civilite") as HTMLSelectElement).value);
    formData.append("prenom", (form.elements.namedItem("prenom") as HTMLInputElement).value);
    formData.append("nom", (form.elements.namedItem("nom") as HTMLInputElement).value);
    formData.append("email", (form.elements.namedItem("email") as HTMLInputElement).value);
    formData.append("telephone", (form.elements.namedItem("telephone") as HTMLInputElement).value);
    formData.append("adresse", (form.elements.namedItem("adresse") as HTMLInputElement).value);
    formData.append("surface", (form.elements.namedItem("surface") as HTMLInputElement).value);
    formData.append("pieces", (form.elements.namedItem("pieces") as HTMLSelectElement).value);
    formData.append("etage", (form.elements.namedItem("etage") as HTMLInputElement).value);
    formData.append("etat", (form.elements.namedItem("etat") as HTMLSelectElement).value);
    formData.append("disponibilite", (form.elements.namedItem("disponibilite") as HTMLInputElement).value);
    formData.append("description", (form.elements.namedItem("description") as HTMLTextAreaElement).value);
    photoFiles.slice(0, 5).forEach((file) => formData.append("photos", file));

    try {
      await fetch("/api/contact", { method: "POST", body: formData });
      setSent(true);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <section className="py-20 bg-blanc">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-5 gap-16">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:col-span-2">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">Formulaire propriétaire</span>
            <h2 className="font-serif text-3xl text-noir mt-3 mb-6">Louez votre <span className="text-gold">appartement</span></h2>
            <div className="space-y-4 text-gris font-light leading-relaxed text-sm">
              <p>Vous souhaitez mettre votre bien en location meublée corporate ? Complétez le formulaire ci-contre et notre équipe vous recontactera rapidement.</p>
              <p><strong className="text-noir font-medium">Critères requis :</strong></p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Appartement disponible pour une durée minimum de 12 mois</li>
                <li className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Bien situé à Paris ou en proche banlieue ouest</li>
                <li className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Appartement meublé ou à meubler</li>
                <li className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Bon état général et conformité technique</li>
              </ul>
            </div>
            <div className="mt-10 p-6 bg-blanc-chaud border border-gris-clair/50">
              <h3 className="font-serif text-lg text-noir mb-3">Besoin d&apos;aide ?</h3>
              <p className="text-gris text-sm font-light mb-3">Contactez-nous directement :</p>
              <p className="text-noir font-medium">+33 1 45 20 06 03</p>
              <p className="text-gold text-sm">contact@move-in-paris.com</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="lg:col-span-3">
            {sent ? (
              <div className="bg-blanc-chaud border border-gris-clair/50 p-8 lg:p-10 text-center py-20">
                <div className="text-gold text-5xl mb-4">✓</div>
                <h3 className="font-serif text-2xl text-noir mb-3">Demande envoyée !</h3>
                <p className="text-gris font-light">Nous vous recontacterons sous 24h pour une estimation gratuite.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-gold text-sm hover:text-gold-dark transition-colors">
                  Envoyer une autre demande
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-blanc-chaud border border-gris-clair/50 p-8 lg:p-10 space-y-6">
                <h3 className="font-serif text-2xl text-noir mb-2">Vos informations</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Civilité</label>
                    <select name="civilite" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
                      <option value="">Sélectionnez</option>
                      <option value="mr">Monsieur</option>
                      <option value="mme">Madame</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Prénom</label>
                    <input name="prenom" type="text" required className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Nom</label>
                    <input name="nom" type="text" required className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Email</label>
                    <input name="email" type="email" required className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Téléphone</label>
                    <input name="telephone" type="tel" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                </div>
                <div className="pt-4 border-t border-gris-clair/50">
                  <h3 className="font-serif text-2xl text-noir mb-4">Votre appartement</h3>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Adresse du bien</label>
                  <input name="adresse" type="text" placeholder="Numéro, rue, code postal, ville" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Surface (m²)</label>
                    <input name="surface" type="number" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Nb de pièces</label>
                    <select name="pieces" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
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
                    <input name="etage" type="text" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Le bien est</label>
                    <select name="etat" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors">
                      <option value="">Sélectionnez</option>
                      <option value="meuble">Déjà meublé</option>
                      <option value="a-meubler">À meubler</option>
                      <option value="partiellement">Partiellement meublé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gris uppercase tracking-wider mb-2">Disponibilité</label>
                    <input name="disponibilite" type="date" className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Description / Commentaires</label>
                  <textarea name="description" rows={4} placeholder="Décrivez votre bien, ses atouts, vos attentes..."
                    className="w-full px-4 py-3 border border-gris-clair bg-blanc text-noir text-sm focus:border-gold focus:outline-none transition-colors resize-none" />
                </div>
                {/* Photos */}
                <div>
                  <label className="block text-xs text-gris uppercase tracking-wider mb-2">Photos de votre bien (optionnel — 5 max)</label>
                  {photoFiles.length >= 5 ? (
                    <div className="w-full border-2 border-dashed border-gris-clair p-6 text-center">
                      <div className="text-xs text-gris">Maximum 5 photos atteint</div>
                    </div>
                  ) : (
                    <label className="block w-full border-2 border-dashed border-gris-clair hover:border-gold transition-colors p-6 text-center cursor-pointer">
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                      <div className="text-gold text-2xl mb-1">+</div>
                      <div className="text-xs text-gris">Cliquez pour ajouter des photos ({photoFiles.length}/5)</div>
                    </label>
                  )}
                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {photoPreviews.map((src, i) => (
                        <div key={i} className="relative aspect-square group">
                          <div className="absolute inset-0 bg-cover bg-center rounded" style={{ backgroundImage: `url('${src}')` }} />
                          <button type="button" onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <input type="checkbox" id="cgu" required className="mt-1 accent-[#B88B58]" />
                  <label htmlFor="cgu" className="text-xs text-gris leading-relaxed">
                    J&apos;accepte les conditions générales d&apos;utilisation et la politique relative aux données personnelles (RGPD).
                  </label>
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all duration-300 ${loading ? "bg-gris text-blanc" : "bg-gold text-noir-deep hover:bg-gold-light"}`}>
                  {loading ? "Envoi en cours..." : "Envoyer ma demande"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";

const EQUIPMENT_OPTIONS = [
  "Wifi",
  "Smart TV",
  "Télévision 4K",
  "Lave-vaisselle",
  "Lave-linge",
  "Sèche-linge",
  "Lave-linge séchant",
  "Cuisine équipée",
  "Four",
  "Micro-ondes",
  "Plaques de cuisson",
  "Réfrigérateur",
  "Congélateur",
  "Machine Nespresso",
  "Cafetière",
  "Bouilloire",
  "Toaster",
  "Aspirateur",
  "Fer à repasser",
  "Table à repasser",
  "Climatisation",
  "Chauffage collectif",
  "Chauffage électrique individuel",
  "Ascenseur",
  "Digicode",
  "Interphone",
  "Gardien",
  "Cave",
  "Parking",
  "Balcon",
  "Terrasse",
  "Parquet",
  "Parquet point de Hongrie",
  "Double vitrage",
  "Volets roulants",
  "Toilettes séparées",
  "Baignoire",
  "Douche à l'italienne",
  "Sèche-cheveux",
  "Linge de maison fourni",
  "Draps fournis",
  "Serviettes fournies",
  "Fibre optique",
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [streetOnly, setStreetOnly] = useState("");
  const [district, setDistrict] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [floor, setFloor] = useState("");
  const [status, setStatus] = useState("À louer");
  const [description, setDescription] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [allFeatures, setAllFeatures] = useState(EQUIPMENT_OPTIONS);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [nearbyRows, setNearbyRows] = useState<{ type: string; name: string; distance: string }[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + (district ? "-" + district.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "");

  // Auto-fetch nearby places when address changes
  async function fetchNearby(address: string) {
    if (address.length < 10) return;
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/nearby?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        setNearbyRows(data.places);
      }
    } catch { /* ignore */ }
    setNearbyLoading(false);
  }

  function handleFullAddress(value: string) {
    setFullAddress(value);
    // Auto-extract street name (remove numbers at start)
    const street = value.replace(/^\d+[,\s]*/,"").split(",")[0].trim();
    setStreetOnly(street);
    // Auto-set title from street
    if (!title || title === streetOnly) {
      setTitle(street);
    }
  }

  function toggleFeature(feature: string) {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  }

  function addCustomFeature() {
    if (customFeature.trim() && !allFeatures.includes(customFeature.trim())) {
      const newFeature = customFeature.trim();
      setAllFeatures((prev) => [...prev, newFeature]);
      setSelectedFeatures((prev) => [...prev, newFeature]);
      setCustomFeature("");
    }
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function addNearbyRow() {
    setNearbyRows((prev) => [...prev, { type: "Métro", name: "", distance: "" }]);
  }

  function updateNearby(index: number, field: string, value: string) {
    setNearbyRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeNearby(index: number) {
    setNearbyRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("password", password);
    formData.append("slug", slug);
    formData.append("title", title);
    formData.append("address", streetOnly + (district ? ", " + district : ""));
    formData.append("district", district);
    formData.append("surface", surface);
    formData.append("rooms", rooms);
    formData.append("bedrooms", bedrooms);
    formData.append("bathrooms", bathrooms);
    formData.append("floor", floor);
    formData.append("status", status);
    formData.append("description", description);
    formData.append("features", selectedFeatures.join("\n"));
    formData.append("nearby", JSON.stringify(nearbyRows.filter((r) => r.name)));
    photos.forEach((photo) => formData.append("photos", photo));

    try {
      const res = await fetch("/api/apartment", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Appartement "${title}" ajouté avec succès ! Il sera en ligne dans ~2 minutes.`);
        setTitle(""); setFullAddress(""); setStreetOnly(""); setDistrict("");
        setSurface(""); setRooms(""); setBedrooms(""); setBathrooms("");
        setFloor(""); setDescription(""); setSelectedFeatures([]);
        setPhotos([]); setPreviews([]);
        setNearbyRows([{ type: "Métro", name: "", distance: "" }]);
      } else {
        setError(data.error || "Erreur lors de l'ajout");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setLoading(false);
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={200} height={200} className="h-24 w-auto mx-auto mb-6" />
            <h1 className="font-serif text-2xl text-white">Administration</h1>
            <p className="text-white/40 text-sm mt-2">Entrez le mot de passe pour continuer</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setAuthenticated(true); }} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:border-[#B88B58] focus:outline-none"
            />
            <button type="submit" className="w-full py-3 bg-[#B88B58] text-[#0D0D0D] font-medium tracking-wider uppercase text-sm hover:bg-[#D4AF7A] transition-all">
              Accéder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#0D0D0D] py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={160} height={160} className="h-16 w-auto" />
            <div>
              <h1 className="text-white font-serif text-xl">Ajouter un appartement</h1>
              <p className="text-white/40 text-xs">L&apos;appartement sera en ligne après publication</p>
            </div>
          </div>
          <a href="/" className="text-[#B88B58] text-sm hover:text-[#D4AF7A] transition-colors">← Retour au site</a>
        </div>
      </div>

      {success && (
        <div className="max-w-4xl mx-auto mt-6 px-6">
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded">{success}</div>
        </div>
      )}
      {error && (
        <div className="max-w-4xl mx-auto mt-6 px-6">
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto py-10 px-6">

        {/* Adresse & infos */}
        <div className="bg-white border border-[#E8E4DF] p-8 mb-6">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-6">Adresse & informations</h2>

          <div className="mb-4">
            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Adresse complète (avec numéro) *</label>
            <input type="text" required value={fullAddress}
              onChange={(e) => handleFullAddress(e.target.value)}
              onBlur={() => fetchNearby(fullAddress)}
              placeholder="12 rue Pergolèse, Paris 16e"
              className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            <p className="text-xs text-[#6B6B6B] mt-1">Le numéro ne sera pas affiché sur le site. Les métros et commerces à proximité seront détectés automatiquement.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Nom de rue (affiché) *</label>
              <input type="text" required value={streetOnly} onChange={(e) => setStreetOnly(e.target.value)}
                placeholder="Rue Pergolèse"
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Titre de l&apos;annonce *</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Rue Pergolèse"
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Quartier *</label>
              <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)}
                placeholder="Paris 16e"
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Étage</label>
              <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)}
                placeholder="3e étage avec ascenseur"
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none">
                <option value="À louer">À louer</option>
                <option value="Disponible">Disponible</option>
                <option value="Loué">Loué</option>
              </select>
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Surface (m²) *</label>
              <input type="number" required value={surface} onChange={(e) => setSurface(e.target.value)}
                placeholder="62" className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Pièces *</label>
              <input type="number" required value={rooms} onChange={(e) => setRooms(e.target.value)}
                placeholder="2" className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Chambres *</label>
              <input type="number" required value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}
                placeholder="1" className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Salle(s) de bain *</label>
              <input type="number" required value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}
                placeholder="1" className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Description *</label>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'appartement : pièces, équipements, ambiance, quartier..."
              className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-none" />
          </div>

          {slug && (
            <p className="mt-3 text-xs text-[#6B6B6B]">
              URL : <span className="text-[#B88B58]">/appartement/{slug}</span>
            </p>
          )}
        </div>

        {/* Photos */}
        <div className="bg-white border border-[#E8E4DF] p-8 mb-6">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-6">Photos</h2>
          <label className="block w-full border-2 border-dashed border-[#E8E4DF] hover:border-[#B88B58] transition-colors p-8 text-center cursor-pointer mb-6">
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
            <div className="text-[#B88B58] text-3xl mb-2">+</div>
            <div className="text-sm text-[#6B6B6B]">Cliquez pour ajouter des photos</div>
            <div className="text-xs text-[#6B6B6B]/60 mt-1">JPG, PNG — plusieurs fichiers possibles</div>
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square group">
                  <div className="absolute inset-0 bg-cover bg-center rounded" style={{ backgroundImage: `url('${src}')` }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    ✕
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{i + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Équipements - Cases à cocher */}
        <div className="bg-white border border-[#E8E4DF] p-8 mb-6">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">Équipements</h2>
          <p className="text-xs text-[#6B6B6B] mb-6">Cochez les équipements présents dans l&apos;appartement</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {allFeatures.map((feature) => (
              <label
                key={feature}
                className={`flex items-center gap-2 px-3 py-2 border cursor-pointer transition-all text-sm ${
                  selectedFeatures.includes(feature)
                    ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]"
                    : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  className="accent-[#B88B58]"
                />
                {feature}
              </label>
            ))}
          </div>

          {/* Ajouter un équipement personnalisé */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFeature(); } }}
              placeholder="Ajouter un équipement..."
              className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
            />
            <button type="button" onClick={addCustomFeature}
              className="px-4 py-2 bg-[#B88B58] text-white text-sm hover:bg-[#D4AF7A] transition-colors">
              Ajouter
            </button>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-2">
            {selectedFeatures.length} équipement{selectedFeatures.length > 1 ? "s" : ""} sélectionné{selectedFeatures.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* À proximité */}
        <div className="bg-white border border-[#E8E4DF] p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-[#1A1A1A]">À proximité</h2>
            {nearbyLoading && <span className="text-sm text-[#B88B58] animate-pulse">Recherche en cours...</span>}
            {!nearbyLoading && nearbyRows.length > 0 && <span className="text-xs text-green-600">✓ {nearbyRows.length} lieu(x) trouvé(s) automatiquement</span>}
            {!nearbyLoading && nearbyRows.length === 0 && <button type="button" onClick={() => fetchNearby(fullAddress)} className="text-xs text-[#B88B58] hover:text-[#9A7345]">Rechercher automatiquement</button>}
          </div>
          {nearbyRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_100px_40px] gap-3 mb-3">
              <select value={row.type} onChange={(e) => updateNearby(i, "type", e.target.value)}
                className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none">
                <option value="Métro">Métro</option>
                <option value="RER">RER</option>
                <option value="Bus">Bus</option>
                <option value="Commerce">Commerce</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Parc">Parc</option>
                <option value="École">École</option>
              </select>
              <input type="text" value={row.name} onChange={(e) => updateNearby(i, "name", e.target.value)}
                placeholder="George V (ligne 1)" className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
              <input type="text" value={row.distance} onChange={(e) => updateNearby(i, "distance", e.target.value)}
                placeholder="5 min" className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
              <button type="button" onClick={() => removeNearby(i)}
                className="text-red-400 hover:text-red-600 transition-colors text-lg">✕</button>
            </div>
          ))}
          <button type="button" onClick={addNearbyRow}
            className="mt-2 text-sm text-[#B88B58] hover:text-[#9A7345] transition-colors">
            + Ajouter un lieu
          </button>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className={`w-full py-4 font-medium tracking-wider uppercase text-sm transition-all ${
            loading ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"
          }`}>
          {loading ? "Publication en cours... (peut prendre 1-2 min)" : "Publier l'appartement"}
        </button>
        <p className="text-center text-xs text-[#6B6B6B] mt-3">
          L&apos;appartement sera en ligne dans ~2 minutes après publication.
        </p>
      </form>
    </div>
  );
}

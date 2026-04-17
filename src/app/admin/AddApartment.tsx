"use client";

import { useState, useRef, useEffect } from "react";

type BanFeature = {
  geometry?: { type: "Point"; coordinates: [number, number] };
  properties: {
    label: string;
    postcode?: string;
    city?: string;
    citycode?: string;
    context?: string;
    name?: string;
  };
};

export const FLOOR_OPTIONS = [
  "Rez-de-chaussée",
  "1er étage",
  "2e étage",
  "3e étage",
  "4e étage",
  "5e étage",
  "6e étage",
  "7e étage",
  "8e étage",
  "9e étage",
  "10e étage et plus",
];

export const ROOM_OPTIONS = [
  { v: 1, label: "Studio" },
  { v: 2, label: "2 pièces" },
  { v: 3, label: "3 pièces" },
  { v: 4, label: "4 pièces" },
  { v: 5, label: "5 pièces" },
  { v: 6, label: "6 pièces et plus" },
];

export const BEDROOM_OPTIONS = [
  { v: 0, label: "0 chambre (studio)" },
  { v: 1, label: "1 chambre" },
  { v: 2, label: "2 chambres" },
  { v: 3, label: "3 chambres" },
  { v: 4, label: "4 chambres" },
  { v: 5, label: "5 chambres et plus" },
];

export const BATHROOM_OPTIONS = [
  { v: 1, label: "1 salle de bain" },
  { v: 2, label: "2 salles de bain" },
  { v: 3, label: "3 salles de bain et plus" },
];

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

export default function AddApartment({ password, onSuccess }: { password: string; onSuccess: () => void }) {
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
  const [hasElevator, setHasElevator] = useState<boolean>(false);
  const [status, setStatus] = useState("À louer");
  const [description, setDescription] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [allFeatures, setAllFeatures] = useState(EQUIPMENT_OPTIONS);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [nearbyRows, setNearbyRows] = useState<{ type: string; name: string; distance: string }[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Address autocomplete (BAN)
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + (district ? "-" + district.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "");

  const [nearbyError, setNearbyError] = useState("");
  const [nearbyDone, setNearbyDone] = useState(false);

  async function fetchNearby() {
    if (fullAddress.length < 5) {
      setNearbyError("Entrez une adresse plus complète");
      return;
    }
    setNearbyLoading(true);
    setNearbyError("");
    setNearbyDone(false);
    try {
      const res = await fetch(`/api/nearby?address=${encodeURIComponent(fullAddress)}`);
      const data = await res.json();
      if (data.error) {
        setNearbyError(data.error);
      } else {
        if (data.district) setDistrict(data.district);
        if (data.places && data.places.length > 0) {
          setNearbyRows(data.places);
        }
        setNearbyDone(true);
      }
    } catch {
      setNearbyError("Erreur de connexion — réessayez");
    }
    setNearbyLoading(false);
  }

  function handleFullAddress(value: string) {
    setFullAddress(value);
    setNearbyDone(false);
    // Auto-extract street name (remove number at start)
    const parts = value.split(",");
    const street = parts[0].replace(/^\d+[,.\s]*/,"").trim();
    if (street) {
      setStreetOnly(street);
      if (!title) setTitle(street);
    }
    // Trigger BAN autocomplete
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setSuggestOpen(true);
    setSuggestLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=6&type=housenumber`
        );
        const data = await res.json();
        setSuggestions((data.features || []) as BanFeature[]);
      } catch {
        setSuggestions([]);
      }
      setSuggestLoading(false);
    }, 220);
  }

  function pickSuggestion(f: BanFeature) {
    const p = f.properties;
    setFullAddress(p.label);
    setSuggestOpen(false);
    setSuggestions([]);
    // Extract street (remove leading number)
    const street = (p.name || p.label.split(",")[0] || "").replace(/^\d+[,.\s]*/, "").trim();
    if (street) {
      setStreetOnly(street);
      if (!title) setTitle(street);
    }
    // Derive district
    const postcode = p.postcode || "";
    if (/^75\d{3}$/.test(postcode)) {
      const n = parseInt(postcode.slice(-2), 10);
      setDistrict(n === 1 ? "Paris 1er" : `Paris ${n}e`);
    } else if (p.city) {
      setDistrict(p.city);
    }
    // Auto-trigger nearby lookup
    setTimeout(() => fetchNearbyFrom(p.label), 0);
  }

  async function fetchNearbyFrom(address: string) {
    if (address.length < 5) return;
    setNearbyLoading(true);
    setNearbyError("");
    setNearbyDone(false);
    try {
      const res = await fetch(`/api/nearby?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.error) {
        setNearbyError(data.error);
      } else {
        if (data.district) setDistrict(data.district);
        if (data.places && data.places.length > 0) setNearbyRows(data.places);
        setNearbyDone(true);
      }
    } catch {
      setNearbyError("Erreur de connexion — réessayez");
    }
    setNearbyLoading(false);
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
    files.forEach((file) => {
      // Compress image before adding
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1600;
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
              setPhotos((prev) => [...prev, compressed]);
              setPreviews((prev) => [...prev, canvas.toDataURL("image/jpeg", 0.85)]);
            }
          }, "image/jpeg", 0.85);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same files can be selected again
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // Drag & drop reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    // Reorder
    const newPhotos = [...photos];
    const newPreviews = [...previews];
    const [movedPhoto] = newPhotos.splice(dragIndex, 1);
    const [movedPreview] = newPreviews.splice(dragIndex, 1);
    newPhotos.splice(index, 0, movedPhoto);
    newPreviews.splice(index, 0, movedPreview);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  // Drag & drop reorder for nearby rows
  const [nearbyDragIndex, setNearbyDragIndex] = useState<number | null>(null);

  function handleNearbyDragStart(index: number) {
    setNearbyDragIndex(index);
  }

  function handleNearbyDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (nearbyDragIndex === null || nearbyDragIndex === index) return;
    const newRows = [...nearbyRows];
    const [moved] = newRows.splice(nearbyDragIndex, 1);
    newRows.splice(index, 0, moved);
    setNearbyRows(newRows);
    setNearbyDragIndex(index);
  }

  function handleNearbyDragEnd() {
    setNearbyDragIndex(null);
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

  const [uploadProgress, setUploadProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Upload photos one by one
      const uploadedImages: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress(`Upload photo ${i + 1}/${photos.length}...`);
        const photoForm = new FormData();
        photoForm.append("password", password);
        photoForm.append("photo", photos[i]);
        photoForm.append("slug", slug);
        photoForm.append("fileName", `photo-${i + 1}.jpg`);

        const res = await fetch("/api/upload-photo", { method: "POST", body: photoForm });
        const data = await res.json();
        if (data.success) {
          uploadedImages.push(data.path);
        } else {
          console.error(`Erreur photo ${i + 1}:`, data.error);
        }
      }

      // Sync "Ascenseur" in features with the toggle
      const featuresWithElevator = hasElevator
        ? (selectedFeatures.includes("Ascenseur") ? selectedFeatures : [...selectedFeatures, "Ascenseur"])
        : selectedFeatures.filter((f) => f !== "Ascenseur");

      // Step 2: Create apartment entry
      setUploadProgress("Création de l'annonce...");
      const res = await fetch("/api/apartment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          slug,
          title,
          address: streetOnly + (district ? ", " + district : ""),
          district,
          surface: parseInt(surface) || 0,
          rooms: parseInt(rooms) || 0,
          bedrooms: parseInt(bedrooms) || 0,
          bathrooms: parseInt(bathrooms) || 0,
          floor,
          hasElevator,
          status,
          description,
          features: featuresWithElevator,
          images: uploadedImages,
          nearby: nearbyRows.filter((r) => r.name),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Appartement "${title}" ajouté avec ${uploadedImages.length} photos ! Il sera en ligne dans ~2 minutes.`);
        setTimeout(() => onSuccess(), 2000);
        setTitle(""); setFullAddress(""); setStreetOnly(""); setDistrict("");
        setSurface(""); setRooms(""); setBedrooms(""); setBathrooms("");
        setFloor(""); setHasElevator(false); setDescription(""); setSelectedFeatures([]);
        setPhotos([]); setPreviews([]);
        setNearbyRows([]);
      } else {
        setError(data.error || "Erreur lors de l'ajout");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setUploadProgress("");
    setLoading(false);
  }

  return (
    <div>
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

          <div className="mb-4" ref={wrapperRef}>
            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Adresse complète (avec numéro) *</label>
            <div className="relative">
              <input type="text" required value={fullAddress}
                onChange={(e) => handleFullAddress(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setSuggestOpen(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchNearby(); } }}
                placeholder="Commencez à taper : 12 rue Pergolèse…"
                autoComplete="off"
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
              {suggestOpen && (suggestLoading || suggestions.length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E8E4DF] shadow-xl z-20 max-h-72 overflow-y-auto">
                  {suggestLoading && suggestions.length === 0 && (
                    <div className="px-4 py-3 text-sm text-[#6B6B6B] italic">Recherche…</div>
                  )}
                  {suggestions.map((f, i) => (
                    <button type="button" key={`${f.properties.label}-${i}`}
                      onClick={() => pickSuggestion(f)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#FAFAF8] transition-colors border-b border-[#E8E4DF]/60 last:border-b-0">
                      <div className="text-[#1A1A1A]">{f.properties.label}</div>
                      <div className="text-xs text-[#6B6B6B] mt-0.5">{f.properties.postcode} {f.properties.city}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {nearbyError && <p className="text-xs text-red-500 mt-1">{nearbyError}</p>}
            {nearbyDone && <p className="text-xs text-green-600 mt-1">✓ Adresse validée — quartier, métros et commerces détectés</p>}
            {nearbyLoading && <p className="text-xs text-[#B88B58] mt-1">⏳ Détection des métros et commerces…</p>}
            {!nearbyDone && !nearbyError && !nearbyLoading && <p className="text-xs text-[#6B6B6B] mt-1">Sélectionnez une suggestion dans la liste. Le numéro ne sera pas affiché sur le site.</p>}
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
              <select value={floor} onChange={(e) => setFloor(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                <option value="">Sélectionner…</option>
                {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Ascenseur</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHasElevator(true)}
                  className={`flex-1 py-3 text-sm border transition-all ${hasElevator ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]" : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"}`}>
                  Oui
                </button>
                <button type="button" onClick={() => setHasElevator(false)}
                  className={`flex-1 py-3 text-sm border transition-all ${!hasElevator ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]" : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"}`}>
                  Non
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                <option value="À louer">À louer</option>
                <option value="Disponible">Disponible</option>
                <option value="Loué">Loué</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Surface (m²) *</label>
              <input type="number" required value={surface} onChange={(e) => setSurface(e.target.value)}
                placeholder="62" className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Pièces *</label>
              <select required value={rooms} onChange={(e) => setRooms(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                <option value="">Sélectionner…</option>
                {ROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Chambres *</label>
              <select required value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                <option value="">Sélectionner…</option>
                {BEDROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">Salle(s) de bain *</label>
              <select required value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                <option value="">Sélectionner…</option>
                {BATHROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
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
            <>
            <p className="text-xs text-[#6B6B6B] mb-3">Glissez-déposez pour réorganiser l&apos;ordre des photos. La première photo sera la photo principale.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {previews.map((src, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`relative aspect-square group cursor-grab active:cursor-grabbing transition-all ${
                    dragIndex === i ? "opacity-50 scale-95" : ""
                  } ${i === 0 ? "ring-2 ring-[#B88B58]" : ""}`}
                >
                  <div className="absolute inset-0 bg-cover bg-center rounded" style={{ backgroundImage: `url('${src}')` }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    ✕
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {i === 0 ? "★ 1" : i + 1}
                  </div>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 15h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V7z"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            </>
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
            {!nearbyLoading && nearbyRows.length === 0 && <button type="button" onClick={() => fetchNearby()} className="text-xs text-[#B88B58] hover:text-[#9A7345]">Rechercher automatiquement</button>}
          </div>
          {nearbyRows.length > 1 && (
            <p className="text-xs text-[#6B6B6B] mb-3">Glissez-déposez les lignes pour les réorganiser.</p>
          )}
          {nearbyRows.map((row, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => handleNearbyDragStart(i)}
              onDragOver={(e) => handleNearbyDragOver(e, i)}
              onDragEnd={handleNearbyDragEnd}
              className={`grid grid-cols-[24px_120px_1fr_100px_40px] gap-3 mb-3 transition-all ${
                nearbyDragIndex === i ? "opacity-50 scale-[0.99]" : ""
              }`}
            >
              <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-[#6B6B6B] hover:text-[#B88B58] transition-colors select-none">
                ⠿
              </div>
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
          {loading ? (uploadProgress || "Publication en cours...") : "Publier l'appartement"}
        </button>
        <p className="text-center text-xs text-[#6B6B6B] mt-3">
          L&apos;appartement sera en ligne dans ~2 minutes après publication.
        </p>
      </form>
    </div>
  );
}

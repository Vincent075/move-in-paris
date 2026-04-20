"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import AddApartment, { FLOOR_OPTIONS, ROOM_OPTIONS, BEDROOM_OPTIONS, BATHROOM_OPTIONS } from "./AddApartment";

const AMENITIES: { fr: string; en: string }[] = [
  { fr: "Wifi", en: "Wifi" },
  { fr: "Télévision", en: "TV" },
  { fr: "Télévision 4K", en: "4K TV" },
  { fr: "Canal+", en: "Canal+" },
  { fr: "Lave-vaisselle", en: "Dishwasher" },
  { fr: "Lave-linge", en: "Washing machine" },
  { fr: "Lave-linge séchant", en: "Washer-dryer" },
  { fr: "Sèche-linge", en: "Dryer" },
  { fr: "Four", en: "Oven" },
  { fr: "Micro-ondes", en: "Microwave" },
  { fr: "Plaques de cuisson", en: "Cooktop" },
  { fr: "Réfrigérateur", en: "Refrigerator" },
  { fr: "Congélateur", en: "Freezer" },
  { fr: "Machine Nespresso", en: "Nespresso machine" },
  { fr: "Bouilloire", en: "Kettle" },
  { fr: "Grille-pain", en: "Toaster" },
  { fr: "Hotte aspirante", en: "Range hood" },
  { fr: "Cuisine équipée", en: "Fully equipped kitchen" },
  { fr: "Cuisine américaine", en: "Open kitchen" },
  { fr: "Ascenseur", en: "Elevator" },
  { fr: "Digicode", en: "Keypad access" },
  { fr: "Interphone", en: "Intercom" },
  { fr: "Gardien", en: "Caretaker" },
  { fr: "Balcon", en: "Balcony" },
  { fr: "Terrasse", en: "Terrace" },
  { fr: "Jardin", en: "Garden" },
  { fr: "Cheminée", en: "Fireplace" },
  { fr: "Parquet", en: "Hardwood floor" },
  { fr: "Moquette", en: "Carpet" },
  { fr: "Double vitrage", en: "Double glazing" },
  { fr: "Climatisation", en: "Air conditioning" },
  { fr: "Chauffage électrique", en: "Electric heating" },
  { fr: "Chauffage gaz", en: "Gas heating" },
  { fr: "Chauffage collectif", en: "Collective heating" },
  { fr: "Chauffage au sol", en: "Floor heating" },
  { fr: "Toilettes séparées", en: "Separate toilet" },
  { fr: "Baignoire", en: "Bathtub" },
  { fr: "Douche", en: "Shower" },
  { fr: "Sèche-cheveux", en: "Hair dryer" },
  { fr: "Fer à repasser", en: "Iron" },
  { fr: "Aspirateur", en: "Vacuum cleaner" },
  { fr: "Linge de lit fourni", en: "Bed linen provided" },
  { fr: "Serviettes fournies", en: "Towels provided" },
  { fr: "Ménage hebdomadaire", en: "Weekly cleaning" },
  { fr: "Parking", en: "Parking" },
  { fr: "Cave", en: "Cellar" },
].sort((a, b) => a.fr.localeCompare(b.fr, "fr", { sensitivity: "base" }));

interface Nearby {
  type: string;
  name: string;
  distance: string;
  lines?: string[];
}

interface Apartment {
  slug: string;
  title: string;
  title_en?: string;
  address: string;
  address_en?: string;
  district: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  floor_en?: string;
  hasElevator?: boolean;
  status: string;
  description: string;
  description_en?: string;
  features: string[];
  features_en?: string[];
  images: string[];
  nearby: Nearby[];
}

export default function AdminDashboard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Apartment>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [customAmenity, setCustomAmenity] = useState("");
  const [nearbyDetecting, setNearbyDetecting] = useState(false);
  const [nearbyDetectMsg, setNearbyDetectMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const editNearbyFetchIdRef = useRef(0);

  async function fetchApartments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apartment-update?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.apartments) setApartments(data.apartments);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    if (authenticated) fetchApartments();
  }, [authenticated]);

  async function handleSave(slug: string) {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/apartment-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, slug, updates: editData }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `"${editData.title || slug}" modifié ! En ligne dans ~2 min.` });
        setEditingSlug(null);
        setEditData({});
        fetchApartments();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion" });
    }
    setSaving(false);
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return;
    try {
      const res = await fetch("/api/apartment-update", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, slug }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `"${title}" supprimé.` });
        fetchApartments();
      }
    } catch { /* ignore */ }
  }

  function startEdit(apt: Apartment) {
    setEditingSlug(apt.slug);
    const inferredElevator = apt.hasElevator ?? (apt.features || []).includes("Ascenseur");
    setEditData({ ...apt, hasElevator: inferredElevator });
  }

  function moveImage(from: number, to: number) {
    const imgs = [...(editData.images || [])];
    if (to < 0 || to >= imgs.length) return;
    const [m] = imgs.splice(from, 1);
    imgs.splice(to, 0, m);
    setEditData({ ...editData, images: imgs });
  }

  /**
   * Move `from` to land AT visual position `targetIdx` (i.e. the dragged item
   * becomes the item at index `targetIdx` in the new array).
   */
  function reorderImage(from: number, targetIdx: number) {
    if (from === targetIdx) return;
    const imgs = [...(editData.images || [])];
    const [m] = imgs.splice(from, 1);
    // After removal, if target was after the removed item, it shifts down by 1.
    const insertAt = from < targetIdx ? targetIdx : targetIdx;
    const clamped = Math.max(0, Math.min(insertAt, imgs.length));
    imgs.splice(clamped, 0, m);
    setEditData({ ...editData, images: imgs });
  }

  function handleDragStart(e: React.DragEvent, i: number) {
    setDragIdx(i);
    // Firefox needs data to be set to initiate drag
    try { e.dataTransfer.setData("text/plain", String(i)); } catch {}
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx === null || dragIdx === i) return;
    setDragOverIdx(i);
  }
  function handleDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx === null) return;
    reorderImage(dragIdx, i);
    setDragIdx(null);
    setDragOverIdx(null);
  }
  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function toggleAmenity(am: { fr: string; en: string }, checked: boolean) {
    const fr = new Set(editData.features || []);
    const en = new Set(editData.features_en || []);
    if (checked) {
      fr.add(am.fr);
      en.add(am.en);
    } else {
      fr.delete(am.fr);
      en.delete(am.en);
    }
    setEditData({ ...editData, features: Array.from(fr), features_en: Array.from(en) });
  }

  /** Full amenities list for edit mode: dictionary + any custom features already
   *  on the apartment (so they appear as toggleable checkboxes), sorted alpha. */
  function mergedAmenities(): { fr: string; en: string }[] {
    const byFr = new Map<string, { fr: string; en: string }>();
    for (const a of AMENITIES) byFr.set(a.fr.toLowerCase(), a);
    const existingFr = editData.features || [];
    const existingEn = editData.features_en || [];
    existingFr.forEach((fr, i) => {
      const key = fr.toLowerCase();
      if (!byFr.has(key)) byFr.set(key, { fr, en: existingEn[i] || fr });
    });
    return Array.from(byFr.values()).sort((a, b) =>
      a.fr.localeCompare(b.fr, "fr", { sensitivity: "base" }),
    );
  }

  async function autoDetectNearby() {
    const address = editData.address || "";
    if (address.length < 5) {
      setNearbyDetectMsg({ type: "err", text: "Adresse trop courte pour la détection" });
      return;
    }
    const myId = ++editNearbyFetchIdRef.current;
    setNearbyDetecting(true);
    setNearbyDetectMsg(null);

    async function attempt(): Promise<{
      error?: string;
      district?: string;
      places?: { type: string; name: string; distance: string; lines?: string[] }[];
    }> {
      const res = await fetch(`/api/nearby?address=${encodeURIComponent(address)}`);
      return res.json();
    }

    let data: Awaited<ReturnType<typeof attempt>> | null = null;
    try {
      data = await attempt();
      if (data && !data.error && (!data.places || data.places.length === 0)) {
        await new Promise((r) => setTimeout(r, 400));
        if (editNearbyFetchIdRef.current !== myId) return;
        data = await attempt();
      }
    } catch {
      if (editNearbyFetchIdRef.current !== myId) return;
      try { data = await attempt(); } catch { data = null; }
    }

    if (editNearbyFetchIdRef.current !== myId) return;

    if (!data) {
      setNearbyDetectMsg({ type: "err", text: "Erreur de connexion — réessayez" });
    } else if (data.error) {
      setNearbyDetectMsg({ type: "err", text: data.error });
    } else if (!data.places || data.places.length === 0) {
      setNearbyDetectMsg({ type: "err", text: "Aucun lieu trouvé à proximité" });
    } else {
      setEditData({ ...editData, nearby: data.places });
      setNearbyDetectMsg({ type: "ok", text: `✓ ${data.places.length} lieux détectés` });
    }
    setNearbyDetecting(false);
  }

  function addCustomAmenity() {
    const raw = customAmenity.trim();
    if (!raw) return;
    const normalized = raw.charAt(0).toUpperCase() + raw.slice(1);
    const key = normalized.toLowerCase();
    const existing = AMENITIES.find((a) => a.fr.toLowerCase() === key);
    const fr = existing ? existing.fr : normalized;
    const en = existing ? existing.en : normalized; // auto-translated on save
    const currentFr = editData.features || [];
    if (!currentFr.some((f) => f.toLowerCase() === fr.toLowerCase())) {
      const currentEn = editData.features_en || [];
      setEditData({
        ...editData,
        features: [...currentFr, fr],
        features_en: [...currentEn, en],
      });
    }
    setCustomAmenity("");
  }

  function setCoverImage(idx: number) {
    if (idx === 0) return;
    const imgs = [...(editData.images || [])];
    const [m] = imgs.splice(idx, 1);
    imgs.unshift(m);
    setEditData({ ...editData, images: imgs });
  }

  function removeImage(idx: number) {
    const imgs = [...(editData.images || [])];
    imgs.splice(idx, 1);
    setEditData({ ...editData, images: imgs });
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0 || !editData.slug) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    setMessage({ type: "", text: "" });

    const existing = [...(editData.images || [])];
    // Determine next index by scanning existing filenames like "01.jpg"
    let nextIdx = 1;
    for (const img of existing) {
      const m = img.match(/(\d+)\.[a-z]+$/i);
      if (m) nextIdx = Math.max(nextIdx, parseInt(m[1]) + 1);
    }

    const uploaded: string[] = [];
    let i = 0;
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${String(nextIdx + i).padStart(2, "0")}.${ext}`;
      const fd = new FormData();
      fd.append("password", password);
      fd.append("photo", file);
      fd.append("slug", editData.slug);
      fd.append("fileName", fileName);
      try {
        const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success && data.path) {
          uploaded.push(data.path);
        } else {
          setMessage({ type: "error", text: `Erreur upload ${file.name}: ${data.error || "inconnue"}` });
        }
      } catch {
        setMessage({ type: "error", text: `Erreur upload ${file.name}` });
      }
      i += 1;
      setUploadProgress({ done: i, total: files.length });
    }

    if (uploaded.length > 0) {
      setEditData((prev) => ({ ...prev, images: [...(prev.images || []), ...uploaded] }));
      setMessage({ type: "success", text: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} ajoutée${uploaded.length > 1 ? "s" : ""}. N'oublie pas d'enregistrer les modifications.` });
    }
    setUploading(false);
  }

  function updateNearby(idx: number, field: keyof Nearby, value: string) {
    const list = [...(editData.nearby || [])];
    if (field === "lines") {
      list[idx] = { ...list[idx], lines: value.split(",").map((s) => s.trim()).filter(Boolean) };
    } else {
      list[idx] = { ...list[idx], [field]: value };
    }
    setEditData({ ...editData, nearby: list });
  }

  function addNearby() {
    const list = [...(editData.nearby || [])];
    list.push({ type: "Métro", name: "", distance: "5 min", lines: [] });
    setEditData({ ...editData, nearby: list });
  }

  function removeNearby(idx: number) {
    const list = [...(editData.nearby || [])];
    list.splice(idx, 1);
    setEditData({ ...editData, nearby: list });
  }

  function toggleEditElevator(value: boolean) {
    setEditData((prev) => {
      const features = prev.features || [];
      const newFeatures = value
        ? (features.includes("Ascenseur") ? features : [...features, "Ascenseur"])
        : features.filter((f) => f !== "Ascenseur");
      return { ...prev, hasElevator: value, features: newFeatures };
    });
  }

  function handleStatusToggle(apt: Apartment) {
    const statuses = ["À louer", "Disponible", "Loué"];
    const currentIdx = statuses.indexOf(apt.status);
    const newStatus = statuses[(currentIdx + 1) % statuses.length];
    fetch("/api/apartment-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, slug: apt.slug, updates: { status: newStatus } }),
    }).then(() => fetchApartments());
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || "Identifiants invalides");
      }
    } catch {
      setAuthError("Erreur de connexion");
    }
    setAuthLoading(false);
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={200} height={200} className="h-24 w-auto mx-auto mb-6" />
            <h1 className="font-serif text-2xl text-white">Administration</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur" autoComplete="username" required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:border-[#B88B58] focus:outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe" autoComplete="current-password" required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:border-[#B88B58] focus:outline-none" />
            {authError && (
              <p className="text-red-400 text-xs">{authError}</p>
            )}
            <button type="submit" disabled={authLoading}
              className={`w-full py-3 font-medium tracking-wider uppercase text-sm transition-all ${authLoading ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"}`}>
              {authLoading ? "Vérification…" : "Accéder"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#0D0D0D] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={160} height={160} className="h-14 w-auto" />
            <div>
              <h1 className="text-white font-serif text-lg">Administration</h1>
              <p className="text-white/40 text-xs">{apartments.length} appartement{apartments.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          <a href="/" className="text-[#B88B58] text-sm hover:text-[#D4AF7A]">← Retour au site</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E8E4DF]">
        <div className="max-w-5xl mx-auto px-6 flex">
          <button onClick={() => setActiveTab("list")}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "list" ? "border-[#B88B58] text-[#1A1A1A]" : "border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]"}`}>
            Mes appartements ({apartments.length})
          </button>
          <button onClick={() => setActiveTab("add")}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "add" ? "border-[#B88B58] text-[#1A1A1A]" : "border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]"}`}>
            + Ajouter un appartement
          </button>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div className="max-w-5xl mx-auto mt-4 px-6">
          <div className={`p-4 text-sm rounded ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {message.text}
            <button onClick={() => setMessage({ type: "", text: "" })} className="float-right text-lg leading-none">&times;</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto py-8 px-6">
        {activeTab === "list" ? (
          <>
            {loading ? (
              <div className="text-center py-20 text-[#6B6B6B]">Chargement...</div>
            ) : apartments.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">🏠</div>
                <p className="text-[#6B6B6B]">Aucun appartement pour le moment.</p>
                <button onClick={() => setActiveTab("add")} className="mt-4 text-[#B88B58] text-sm hover:text-[#9A7345]">
                  Ajouter mon premier appartement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {apartments.map((apt) => (
                  <div key={apt.slug} className="bg-white border border-[#E8E4DF] overflow-hidden">
                    {editingSlug === apt.slug ? (
                      /* EDIT MODE */
                      <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-xl text-[#1A1A1A]">Modifier : {apt.title}</h3>
                          <button onClick={() => { setEditingSlug(null); setEditData({}); }} className="text-[#6B6B6B] text-sm hover:text-red-500">
                            Annuler
                          </button>
                        </div>

                        {/* ========== PHOTOS ========== */}
                        <section>
                          <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
                            <div>
                              <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em]">Photos ({(editData.images || []).length})</h4>
                              <p className="text-xs text-[#6B6B6B] mt-0.5">La première photo sert de couverture. Utilisez ↑↓ pour réordonner, ⭐ pour définir la couverture, ✕ pour retirer.</p>
                            </div>
                            <label className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider cursor-pointer transition-all ${uploading ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"}`}>
                              {uploading
                                ? `Upload ${uploadProgress.done}/${uploadProgress.total}…`
                                : "+ Ajouter des photos"}
                              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple hidden
                                disabled={uploading}
                                onChange={(e) => { uploadPhotos(e.target.files); e.target.value = ""; }} />
                            </label>
                          </div>
                          {(editData.images || []).length === 0 ? (
                            <p className="text-sm text-[#6B6B6B] italic p-4 border border-dashed border-[#E8E4DF]">Aucune photo.</p>
                          ) : (
                            <div
                              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) { reorderImage(dragIdx, (editData.images || []).length); setDragIdx(null); setDragOverIdx(null); } }}
                            >
                              {(editData.images || []).map((img, i) => {
                                const isDragging = dragIdx === i;
                                const isDragOver = dragOverIdx === i && dragIdx !== null && dragIdx !== i;
                                const showLeftIndicator = isDragOver && (dragIdx ?? 0) > i;
                                const showRightIndicator = isDragOver && (dragIdx ?? 0) < i;
                                return (
                                  <div
                                    key={`${img}-${i}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i)}
                                    onDragOver={(e) => handleDragOver(e, i)}
                                    onDragLeave={() => setDragOverIdx(null)}
                                    onDrop={(e) => handleDrop(e, i)}
                                    onDragEnd={handleDragEnd}
                                    className={`relative group border-2 transition-all ${
                                      i === 0 ? "border-[#B88B58]" : "border-transparent"
                                    } ${isDragging ? "opacity-40" : ""} cursor-grab active:cursor-grabbing`}
                                  >
                                    {showLeftIndicator && (
                                      <div className="absolute -left-[8px] top-0 bottom-0 w-1 bg-[#B88B58] z-10 rounded-full" />
                                    )}
                                    {showRightIndicator && (
                                      <div className="absolute -right-[8px] top-0 bottom-0 w-1 bg-[#B88B58] z-10 rounded-full" />
                                    )}
                                    <div className="aspect-square bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('${img}')` }} />
                                    {i === 0 && (
                                      <div className="absolute top-1 left-1 px-2 py-0.5 bg-[#B88B58] text-[#0D0D0D] text-[9px] uppercase tracking-wider font-semibold pointer-events-none">Couverture</div>
                                    )}
                                    <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/50 text-white text-xs pointer-events-none">⋮⋮</div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                      <button type="button" onClick={() => setCoverImage(i)} disabled={i === 0} title="Définir comme couverture"
                                        className="w-7 h-7 flex items-center justify-center bg-white/90 text-[#B88B58] text-xs disabled:opacity-30 hover:bg-[#B88B58] hover:text-white">⭐</button>
                                      <button type="button" onClick={() => removeImage(i)} title="Retirer"
                                        className="w-7 h-7 flex items-center justify-center bg-white/90 text-red-500 text-xs hover:bg-red-500 hover:text-white">✕</button>
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 pointer-events-none">{i + 1}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>

                        {/* ========== FR / EN titles + addresses ========== */}
                        <section className="border-t border-[#E8E4DF] pt-6">
                          <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em] mb-3">Titre & Adresse</h4>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Titre (FR)</label>
                              <input value={editData.title || ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Titre (EN)</label>
                              <input value={editData.title_en || ""} onChange={(e) => setEditData({ ...editData, title_en: e.target.value })}
                                placeholder={editData.title || ""}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Adresse (FR)</label>
                              <input value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Adresse (EN)</label>
                              <input value={editData.address_en || ""} onChange={(e) => setEditData({ ...editData, address_en: e.target.value })}
                                placeholder={editData.address || ""}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                          </div>
                        </section>

                        {/* ========== Specs ========== */}
                        <section className="border-t border-[#E8E4DF] pt-6">
                          <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em] mb-3">Caractéristiques</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Surface (m²)</label>
                              <input type="number" value={editData.surface || ""} onChange={(e) => setEditData({ ...editData, surface: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Pièces</label>
                              <select value={editData.rooms ?? ""} onChange={(e) => setEditData({ ...editData, rooms: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                                <option value="">—</option>
                                {ROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Chambres</label>
                              <select value={editData.bedrooms ?? ""} onChange={(e) => setEditData({ ...editData, bedrooms: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                                <option value="">—</option>
                                {BEDROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">SdB</label>
                              <select value={editData.bathrooms ?? ""} onChange={(e) => setEditData({ ...editData, bathrooms: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                                <option value="">—</option>
                                {BATHROOM_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Statut</label>
                              <select value={editData.status || ""} onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                                <option value="À louer">À louer</option>
                                <option value="Disponible">Disponible</option>
                                <option value="Loué">Loué</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-4 mt-4">
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Étage (FR)</label>
                              <select value={editData.floor || ""} onChange={(e) => setEditData({ ...editData, floor: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                                <option value="">—</option>
                                {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Étage (EN)</label>
                              <input value={editData.floor_en || ""} onChange={(e) => setEditData({ ...editData, floor_en: e.target.value })}
                                placeholder="e.g. 3rd floor with elevator"
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Ascenseur</label>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => toggleEditElevator(true)}
                                  className={`flex-1 py-2 text-sm border transition-all ${editData.hasElevator ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]" : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"}`}>
                                  Oui
                                </button>
                                <button type="button" onClick={() => toggleEditElevator(false)}
                                  className={`flex-1 py-2 text-sm border transition-all ${editData.hasElevator === false ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]" : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"}`}>
                                  Non
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* ========== Descriptions FR / EN ========== */}
                        <section className="border-t border-[#E8E4DF] pt-6">
                          <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em] mb-3">Descriptions</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Description (FR)</label>
                              <textarea rows={8} value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-y" />
                            </div>
                            <div>
                              <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Description (EN)</label>
                              <textarea rows={8} value={editData.description_en || ""} onChange={(e) => setEditData({ ...editData, description_en: e.target.value })}
                                placeholder="Leave empty to fall back to FR"
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-y" />
                            </div>
                          </div>
                        </section>

                        {/* ========== Features (checkboxes) ========== */}
                        <section className="border-t border-[#E8E4DF] pt-6">
                          <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
                            <div>
                              <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em]">Équipements</h4>
                              <p className="text-xs text-[#6B6B6B] mt-0.5">Cochez les équipements présents. Les traductions FR/EN sont gérées automatiquement.</p>
                            </div>
                            <span className="text-xs text-[#6B6B6B]">{(editData.features || []).length} sélectionné{(editData.features || []).length > 1 ? "s" : ""}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {mergedAmenities().map((am) => {
                              const checked = (editData.features || []).includes(am.fr);
                              return (
                                <label key={am.fr} className={`flex items-center gap-2 px-3 py-2 border text-xs cursor-pointer transition-all ${checked ? "border-[#B88B58] bg-[#B88B58]/10 text-[#1A1A1A]" : "border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58]/50"}`}>
                                  <input type="checkbox" checked={checked}
                                    onChange={(e) => toggleAmenity(am, e.target.checked)}
                                    className="accent-[#B88B58] w-4 h-4 flex-shrink-0" />
                                  <span className="leading-tight">
                                    {am.fr}
                                    <span className="block text-[10px] text-[#6B6B6B]/70">{am.en}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Ajouter un équipement oublié</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customAmenity}
                                onChange={(e) => setCustomAmenity(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAmenity(); } }}
                                placeholder="Ex: Piano à queue, Vue Tour Eiffel…"
                                className="flex-1 px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
                              />
                              <button type="button" onClick={addCustomAmenity}
                                className="px-4 py-2 text-xs bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A] uppercase tracking-wider whitespace-nowrap">
                                + Ajouter
                              </button>
                            </div>
                            <p className="text-[10px] text-[#6B6B6B] mt-1">La traduction EN est générée automatiquement à l&apos;enregistrement.</p>
                          </div>
                        </section>

                        {/* ========== Nearby (metros etc.) ========== */}
                        <section className="border-t border-[#E8E4DF] pt-6">
                          <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
                            <div>
                              <h4 className="font-serif text-sm text-[#1A1A1A] uppercase tracking-[0.15em]">À proximité</h4>
                              <p className="text-xs text-[#6B6B6B] mt-0.5">Métros, RER, commerces. Lignes séparées par des virgules (ex: 1, 2, RER A).</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={autoDetectNearby} disabled={nearbyDetecting}
                                className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all ${nearbyDetecting ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#1A1A1A] text-white hover:bg-[#B88B58] hover:text-[#0D0D0D]"}`}>
                                {nearbyDetecting ? "Détection…" : "⟳ Détecter automatiquement"}
                              </button>
                              <button type="button" onClick={addNearby} className="text-xs text-[#B88B58] hover:text-[#9A7345] uppercase tracking-wider">+ Ajouter</button>
                            </div>
                          </div>
                          {nearbyDetectMsg && (
                            <p className={`text-xs mb-3 ${nearbyDetectMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}>
                              {nearbyDetectMsg.text}
                            </p>
                          )}
                          <div className="space-y-2">
                            {(editData.nearby || []).map((n, i) => (
                              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                <select value={n.type} onChange={(e) => updateNearby(i, "type", e.target.value)}
                                  className="col-span-3 px-2 py-1.5 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none bg-white">
                                  <option value="Métro">Métro</option>
                                  <option value="RER">RER</option>
                                  <option value="RER / Métro">RER / Métro</option>
                                  <option value="Bus">Bus</option>
                                  <option value="Tramway">Tramway</option>
                                  <option value="Commerce">Commerce</option>
                                  <option value="Restaurant">Restaurant</option>
                                  <option value="Parc">Parc</option>
                                </select>
                                <input value={n.name} onChange={(e) => updateNearby(i, "name", e.target.value)} placeholder="Nom"
                                  className="col-span-4 px-2 py-1.5 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none" />
                                <input value={(n.lines || []).join(", ")} onChange={(e) => updateNearby(i, "lines", e.target.value)} placeholder="Lignes (1, 2...)"
                                  className="col-span-3 px-2 py-1.5 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none" />
                                <input value={n.distance} onChange={(e) => updateNearby(i, "distance", e.target.value)} placeholder="5 min"
                                  className="col-span-1 px-2 py-1.5 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none" />
                                <button type="button" onClick={() => removeNearby(i)} className="col-span-1 text-red-500 hover:text-red-700 text-sm">✕</button>
                              </div>
                            ))}
                            {(editData.nearby || []).length === 0 && (
                              <p className="text-xs text-[#6B6B6B] italic">Aucune entrée.</p>
                            )}
                          </div>
                        </section>

                        {/* ========== Save ========== */}
                        <div className="border-t border-[#E8E4DF] pt-6 flex items-center gap-4">
                          <button onClick={() => handleSave(apt.slug)} disabled={saving}
                            className={`px-8 py-3 font-medium tracking-wider uppercase text-sm transition-all ${saving ? "bg-[#6B6B6B] text-white" : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"}`}>
                            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                          </button>
                          <button onClick={() => { setEditingSlug(null); setEditData({}); }} className="text-[#6B6B6B] text-sm hover:text-red-500">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div className="flex">
                        {/* Thumbnail */}
                        <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-cover bg-center"
                          style={{ backgroundImage: apt.images[0] ? `url('${apt.images[0]}')` : "none", backgroundColor: "#E8E4DF" }} />

                        {/* Info */}
                        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-serif text-lg text-[#1A1A1A]">{apt.title}</h3>
                                <p className="text-xs text-[#6B6B6B]">{apt.address}</p>
                              </div>
                              <button onClick={() => handleStatusToggle(apt)}
                                className={`px-3 py-1 text-[10px] uppercase tracking-wider flex-shrink-0 cursor-pointer ${
                                  apt.status === "Loué" ? "bg-[#6B6B6B] text-white" : "bg-[#B88B58] text-[#0D0D0D]"
                                }`}>
                                {apt.status}
                              </button>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-[#6B6B6B]">
                              <span>{apt.surface} m²</span>
                              <span>{apt.rooms} p.</span>
                              <span>{apt.bedrooms} ch.</span>
                              <span>{apt.images.length} photos</span>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-3">
                            <button onClick={() => startEdit(apt)}
                              className="px-4 py-1.5 text-xs border border-[#B88B58] text-[#B88B58] hover:bg-[#B88B58] hover:text-[#0D0D0D] transition-all">
                              Modifier
                            </button>
                            <a href={`/appartement/${apt.slug}`} target="_blank"
                              className="px-4 py-1.5 text-xs border border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58] hover:text-[#B88B58] transition-all">
                              Voir
                            </a>
                            <button onClick={() => handleDelete(apt.slug, apt.title)}
                              className="px-4 py-1.5 text-xs text-red-400 hover:text-red-600 transition-colors ml-auto">
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <AddApartment password={password} onSuccess={() => { setActiveTab("list"); fetchApartments(); }} />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import AddApartment, { FLOOR_OPTIONS, ROOM_OPTIONS, BEDROOM_OPTIONS, BATHROOM_OPTIONS } from "./AddApartment";

interface Apartment {
  slug: string;
  title: string;
  address: string;
  district: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  hasElevator?: boolean;
  status: string;
  description: string;
  features: string[];
  images: string[];
  nearby: { type: string; name: string; distance: string }[];
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Apartment>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

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
    // Infer hasElevator from features if not explicitly set
    const inferredElevator = apt.hasElevator ?? (apt.features || []).includes("Ascenseur");
    setEditData({ ...apt, hasElevator: inferredElevator });
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

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/Logo-gold.png" alt="Move in Paris" width={200} height={200} className="h-24 w-auto mx-auto mb-6" />
            <h1 className="font-serif text-2xl text-white">Administration</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setAuthenticated(true); }} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe" className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:border-[#B88B58] focus:outline-none" />
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
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-serif text-xl text-[#1A1A1A]">Modifier : {apt.title}</h3>
                          <button onClick={() => { setEditingSlug(null); setEditData({}); }} className="text-[#6B6B6B] text-sm hover:text-red-500">
                            Annuler
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Titre</label>
                            <input value={editData.title || ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Adresse</label>
                            <input value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div>
                            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Surface</label>
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
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Étage</label>
                            <select value={editData.floor || ""} onChange={(e) => setEditData({ ...editData, floor: e.target.value })}
                              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white">
                              <option value="">—</option>
                              {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
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
                        <div>
                          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Description</label>
                          <textarea rows={3} value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Équipements (un par ligne)</label>
                          <textarea rows={4} value={(editData.features || []).join("\n")}
                            onChange={(e) => setEditData({ ...editData, features: e.target.value.split("\n").filter(Boolean) })}
                            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-none font-mono" />
                        </div>
                        <button onClick={() => handleSave(apt.slug)} disabled={saving}
                          className={`px-8 py-3 font-medium tracking-wider uppercase text-sm transition-all ${saving ? "bg-[#6B6B6B] text-white" : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"}`}>
                          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                        </button>
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

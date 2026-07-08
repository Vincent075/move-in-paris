"use client";

import { useEffect } from "react";

// Prolonge silencieusement la session (90 jours glissants) à chaque visite.
export default function SessionKeepAlive() {
  useEffect(() => {
    fetch("/api/espace-proprio/refresh", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}

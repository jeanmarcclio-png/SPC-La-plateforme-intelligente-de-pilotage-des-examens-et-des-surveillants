"use client";

// Persistance MVP de la Demande client : localStorage côté navigateur.
// (Étape 2 : bascule vers une table Supabase + Server Actions.)
// L'API imite un futur backend pour faciliter la migration.

import type { DemandeClient } from "./types";
import { mockDemandes } from "./mock";

const KEY = "spc_demandes_client_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function chargerDemandes(): DemandeClient[] {
  if (!isBrowser()) return mockDemandes;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(mockDemandes));
      return mockDemandes;
    }
    const list = JSON.parse(raw) as DemandeClient[];
    return Array.isArray(list) ? list : mockDemandes;
  } catch {
    return mockDemandes;
  }
}

function ecrire(list: DemandeClient[]): DemandeClient[] {
  if (isBrowser()) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota / mode privé */ }
  }
  return list;
}

export function enregistrerDemande(d: DemandeClient): DemandeClient[] {
  const list = chargerDemandes();
  const idx = list.findIndex((x) => x.id === d.id);
  const next = idx >= 0 ? list.map((x) => (x.id === d.id ? d : x)) : [d, ...list];
  return ecrire(next);
}

export function supprimerDemande(id: string): DemandeClient[] {
  return ecrire(chargerDemandes().filter((d) => d.id !== id));
}

export function nouvelId(): string {
  return `dem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

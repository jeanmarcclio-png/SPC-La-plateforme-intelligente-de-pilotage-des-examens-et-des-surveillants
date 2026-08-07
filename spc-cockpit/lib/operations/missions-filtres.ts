// Filtres du tableau des missions — logique PURE et testable, partagée entre
// la barre d'outils, le tableau et l'export CSV : ce qui est affiché est
// exactement ce qui est exporté.

import type { LigneMission } from "./missions-dashboard";
import { estEnCours } from "./missions-dashboard";

export interface FiltresMissions {
  recherche: string;
  statut: string; // "" = tous statuts
  du: string; // yyyy-mm-dd — "" = pas de borne
  au: string;
  client: string;
  type: string;
  montantMin: string;
  montantMax: string;
  /** Ne garder que les missions engagées dont la couverture est incomplète. */
  avecAlertes: boolean;
  /** Couverture maximale en % (ex. « 80 » → missions couvertes à 80 % ou moins). */
  couvertureMax: string;
  sallesMin: string;
}

export const FILTRES_VIDES: FiltresMissions = {
  recherche: "",
  statut: "",
  du: "",
  au: "",
  client: "",
  type: "",
  montantMin: "",
  montantMax: "",
  avecAlertes: false,
  couvertureMax: "",
  sallesMin: "",
};

/** Nombre de filtres avancés actifs (affiché sur le bouton « Filtres »). */
export function nbFiltresAvances(f: FiltresMissions): number {
  return [f.client, f.type, f.montantMin, f.montantMax, f.couvertureMax, f.sallesMin].filter((v) => v !== "").length
    + (f.avecAlertes ? 1 : 0);
}

/** Un filtre — quel qu'il soit — est-il actif ? */
export function filtresActifs(f: FiltresMissions): boolean {
  return nbFiltresAvances(f) > 0 || f.recherche !== "" || f.statut !== "" || f.du !== "" || f.au !== "";
}

function nombre(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function tauxCouverture(l: LigneMission): number {
  const requis = l.mission.nbSurveillants;
  return requis > 0 ? Math.min(1, l.surveillantsAffectes / requis) : 1;
}

export function filtrerMissions(lignes: LigneMission[], f: FiltresMissions): LigneMission[] {
  const q = f.recherche.trim().toLowerCase();
  const montantMin = nombre(f.montantMin);
  const montantMax = nombre(f.montantMax);
  const couvertureMax = nombre(f.couvertureMax);
  const sallesMin = nombre(f.sallesMin);

  return lignes.filter((ligne) => {
    const m = ligne.mission;

    if (q) {
      const champs = [m.reference, m.client, m.session ?? "", m.type].join(" ").toLowerCase();
      if (!champs.includes(q)) return false;
    }
    if (f.statut && m.statut !== f.statut) return false;

    // Une mission sans date ne peut pas satisfaire une borne de période.
    if (f.du && (!m.dateMission || m.dateMission < f.du)) return false;
    if (f.au && (!m.dateMission || m.dateMission > f.au)) return false;

    if (f.client && m.client !== f.client) return false;
    if (f.type && m.type !== f.type) return false;
    if (montantMin !== null && m.montantHT < montantMin) return false;
    if (montantMax !== null && m.montantHT > montantMax) return false;
    if (sallesMin !== null && m.nbSalles < sallesMin) return false;
    if (couvertureMax !== null && tauxCouverture(ligne) * 100 > couvertureMax) return false;
    if (f.avecAlertes && !(estEnCours(m.statut) && ligne.surveillantsAffectes < m.nbSurveillants)) return false;

    return true;
  });
}

export type CleTri = "reference" | "client" | "date" | "montant" | "statut" | "avancement";

/** Tri stable du tableau (les valeurs manquantes finissent toujours en fin). */
export function trierMissions(lignes: LigneMission[], cle: CleTri, sens: "asc" | "desc"): LigneMission[] {
  const signe = sens === "asc" ? 1 : -1;
  const valeur = (l: LigneMission): string | number => {
    switch (cle) {
      case "reference": return l.mission.reference;
      case "client": return l.mission.client;
      case "date": return l.mission.dateMission ?? "";
      case "montant": return l.mission.montantHT;
      case "statut": return l.mission.statut;
      case "avancement": return l.avancement;
    }
  };
  return [...lignes].sort((a, b) => {
    const va = valeur(a);
    const vb = valeur(b);
    if (va === "" && vb !== "") return 1; // sans date : toujours en dernier
    if (vb === "" && va !== "") return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * signe;
    return String(va).localeCompare(String(vb), "fr") * signe;
  });
}

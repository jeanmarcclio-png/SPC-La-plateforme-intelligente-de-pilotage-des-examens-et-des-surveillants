// Planification — SOURCE DE VÉRITÉ UNIQUE des trois pages du parcours
// PILOTER (/planification) → PLANIFIER (/planification/planning) →
// OPTIMISER (/planification/copilote).
//
// Règle de non-redondance (prompt §1.1) : chaque information a UN domicile,
// mais les trois pages lisent le MÊME calcul. Un chiffre rappelé en Page 2 ou 3
// ne peut donc jamais contredire la Page 1.
//
// Règle critique des heures (prompt §4) : les durées sont sommées en MINUTES
// exactes puis converties une seule fois. On ne somme jamais des valeurs déjà
// arrondies pour l'affichage — c'est ce qui garantit le total exact de 66,25 h.
//
// Fonctions PURES : aucune dépendance React, aucun accès réseau.

import type { Affectation, Creneau, Mission, Surveillant } from "./types";
import { analyseCouverture, type Couverture } from "./couverture";
import { analyseRentabilite, type Rentabilite } from "./rentabilite";
import { scoreSanteSession, type SanteSession } from "./sante-session";
import { detectSupervisorConflicts } from "./engine/planning-validation";
import type { SupervisorAssignmentInput } from "./engine/types";

export type Periode = "matin" | "apres-midi";

// ---------------------------------------------------------------------------
// Durées — minutes exactes
// ---------------------------------------------------------------------------

const HEURE_RE = /^(\d{1,2}):(\d{2})$/;

/** "08:30" → 510 minutes. null si l'horaire est absent ou invalide. */
export function minutes(t?: string | null): number | null {
  const m = HEURE_RE.exec((t ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Durée d'un créneau en minutes entières (0 si invalide ou fin ≤ début). */
export function dureeMinutes(c: { debut?: string | null; fin?: string | null }): number {
  const a = minutes(c.debut);
  const b = minutes(c.fin);
  if (a == null || b == null || b <= a) return 0;
  return b - a;
}

/** Créneaux d'une affectation, normalisés par période. */
export function creneauxDe(a: Affectation, periode: Periode): Creneau[] {
  if (periode === "matin") {
    if (a.matinCreneaux?.length) return a.matinCreneaux;
    return a.matin && a.matinDebut && a.matinFin ? [{ debut: a.matinDebut, fin: a.matinFin }] : [];
  }
  if (a.apmCreneaux?.length) return a.apmCreneaux;
  return a.apm && a.apmDebut && a.apmFin ? [{ debut: a.apmDebut, fin: a.apmFin }] : [];
}

/** Minutes exactes d'une affectation (matin + après-midi, indépendants). */
export function minutesAffectation(a: Affectation): number {
  return [...creneauxDe(a, "matin"), ...creneauxDe(a, "apres-midi")].reduce((n, c) => n + dureeMinutes(c), 0);
}

/** 397 minutes → 6.616… h. Conversion UNIQUE, jamais depuis un arrondi. */
export const enHeures = (min: number) => min / 60;

/** 66.25 → « 66,25 h » · 2.75 → « 2,8 h » (une décimale à l'affichage). */
export function heuresFR(h: number, decimales = 1): string {
  return `${h.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} h`;
}

/** Total exact d'un ensemble d'affectations (somme des minutes, puis /60). */
export function totalHeures(affectations: Affectation[]): number {
  return enHeures(affectations.reduce((n, a) => n + minutesAffectation(a), 0));
}

// ---------------------------------------------------------------------------
// Lignes d'affectation
// ---------------------------------------------------------------------------

export type NiveauAlerteLigne = "critique" | "avertissement";

export interface AlerteLigne {
  affectationId: number;
  code: "sans-creneau" | "sans-salle" | "horaire-invalide" | "chevauchement" | "double-affectation" | "surcharge";
  niveau: NiveauAlerteLigne;
  texte: string;
}

export interface LigneAffectation {
  id: number;
  surveillantId: number;
  nom: string;
  role: string;
  salle: string;
  matin: Creneau[];
  apm: Creneau[];
  minutes: number;
  heures: number;
  alertes: AlerteLigne[];
}

/** Seuil au-delà duquel la charge d'une journée est signalée (prompt §7.4). */
export const SEUIL_CHARGE_JOUR_H = 9;

function chevauchent(creneaux: Creneau[]): boolean {
  const bornes = creneaux
    .map((c) => [minutes(c.debut), minutes(c.fin)] as const)
    .filter((b): b is readonly [number, number] => b[0] != null && b[1] != null)
    .sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < bornes.length; i++) {
    if (bornes[i][0] < bornes[i - 1][1]) return true;
  }
  return false;
}

function construireLigne(a: Affectation, survById: Map<number, Surveillant>): LigneAffectation {
  const s = survById.get(a.surveillantId);
  const matin = creneauxDe(a, "matin");
  const apm = creneauxDe(a, "apres-midi");
  const min = minutesAffectation(a);
  const nom = s?.nom ?? `Surveillant #${a.surveillantId}`;
  const salle = (a.salle ?? "").trim();

  const alertes: AlerteLigne[] = [];
  const ajouter = (code: AlerteLigne["code"], niveau: NiveauAlerteLigne, texte: string) =>
    alertes.push({ affectationId: a.id, code, niveau, texte });

  if (matin.length === 0 && apm.length === 0) {
    ajouter("sans-creneau", "critique", `${nom} : aucun créneau assigné`);
  } else if (!salle) {
    ajouter("sans-salle", "critique", `${nom} : aucune salle affectée`);
  }
  if ([...matin, ...apm].some((c) => dureeMinutes(c) === 0)) {
    ajouter("horaire-invalide", "critique", `${nom} : horaire invalide (fin ≤ début)`);
  }
  if (chevauchent(matin) || chevauchent(apm)) {
    ajouter("chevauchement", "critique", `${nom} : créneaux qui se chevauchent`);
  }
  if (enHeures(min) > SEUIL_CHARGE_JOUR_H) {
    ajouter("surcharge", "avertissement", `Disponibilité insuffisante : ${nom} — charge estimée à ${heuresFR(enHeures(min), 2)}`);
  }

  return {
    id: a.id,
    surveillantId: a.surveillantId,
    nom,
    role: a.roleMission ?? s?.role ?? "Surveillant salle",
    salle,
    matin,
    apm,
    minutes: min,
    heures: enHeures(min),
    alertes,
  };
}

// ---------------------------------------------------------------------------
// Filtres de la Page 2 (compteurs affichés sur les pastilles)
// ---------------------------------------------------------------------------

export type FiltreLigne = "tous" | "sans-salle" | "matin" | "apm" | "coordination" | "salle" | "volant" | "alertes";

export const FILTRES_LIGNES: { cle: FiltreLigne; label: string }[] = [
  { cle: "tous", label: "Tous" },
  { cle: "sans-salle", label: "Sans salle" },
  { cle: "matin", label: "Matin" },
  { cle: "apm", label: "Après-midi" },
  { cle: "coordination", label: "Coordination" },
  { cle: "salle", label: "Surveillants salle" },
  { cle: "volant", label: "Surveillants volants" },
  { cle: "alertes", label: "Alertes" },
];

export function correspondFiltre(l: LigneAffectation, f: FiltreLigne): boolean {
  const role = l.role.toLowerCase();
  switch (f) {
    case "sans-salle": return !l.salle;
    case "matin": return l.matin.length > 0;
    case "apm": return l.apm.length > 0;
    case "coordination": return role.includes("coordinat");
    case "salle": return role.includes("salle");
    case "volant": return role.includes("volant");
    case "alertes": return l.alertes.length > 0;
    default: return true;
  }
}

export function compteursFiltres(lignes: LigneAffectation[]): Record<FiltreLigne, number> {
  const out = {} as Record<FiltreLigne, number>;
  for (const { cle } of FILTRES_LIGNES) out[cle] = lignes.filter((l) => correspondFiltre(l, cle)).length;
  return out;
}

export function filtrerLignes(lignes: LigneAffectation[], f: FiltreLigne, recherche = ""): LigneAffectation[] {
  const q = recherche.trim().toLowerCase();
  return lignes.filter((l) => {
    if (q && !`${l.nom} ${l.role} ${l.salle}`.toLowerCase().includes(q)) return false;
    return correspondFiltre(l, f);
  });
}

// ---------------------------------------------------------------------------
// Contrôle : sous-effectifs, conflits, équilibrage
// ---------------------------------------------------------------------------

export interface SousEffectifSalle {
  salle: string;
  periode: Periode;
  presents: number;
  reference: number;
  manque: number;
}

/**
 * Salles moins couvertes l'après-midi que le matin (ou l'inverse) : c'est un
 * écart RÉEL et mesurable entre deux demi-journées indépendantes, pas une
 * exigence par salle inventée — le modèle ne porte un effectif requis qu'au
 * niveau de la session.
 */
export function sousEffectifsParSalle(lignes: LigneAffectation[]): SousEffectifSalle[] {
  const salles = [...new Set(lignes.map((l) => l.salle).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const out: SousEffectifSalle[] = [];
  for (const salle of salles) {
    const dansSalle = lignes.filter((l) => l.salle === salle);
    const matin = dansSalle.filter((l) => l.matin.length > 0).length;
    const apm = dansSalle.filter((l) => l.apm.length > 0).length;
    if (apm < matin) out.push({ salle, periode: "apres-midi", presents: apm, reference: matin, manque: matin - apm });
    else if (matin < apm) out.push({ salle, periode: "matin", presents: matin, reference: apm, manque: apm - matin });
  }
  return out;
}

export interface Equilibrage {
  ecartMax: number; // heures entre la charge la plus forte et la plus faible
  cible: number; // écart acceptable (± heures)
  plusCharge?: { nom: string; heures: number };
  moinsCharge?: { nom: string; heures: number };
  aRepartir: number; // heures à transférer pour revenir dans la cible
}

export const ECART_CIBLE_H = 2;

export function equilibrageCharge(lignes: LigneAffectation[]): Equilibrage {
  const actives = lignes.filter((l) => l.minutes > 0).sort((a, b) => b.heures - a.heures);
  if (actives.length < 2) return { ecartMax: 0, cible: ECART_CIBLE_H, aRepartir: 0 };
  const haut = actives[0];
  const bas = actives[actives.length - 1];
  const ecartMax = haut.heures - bas.heures;
  return {
    ecartMax,
    cible: ECART_CIBLE_H,
    plusCharge: { nom: haut.nom, heures: haut.heures },
    moinsCharge: { nom: bas.nom, heures: bas.heures },
    aRepartir: Math.max(0, (ecartMax - ECART_CIBLE_H) / 2),
  };
}

/** Conflits inter-missions du moteur central : même surveillant, même jour. */
export function conflitsSession(input: {
  missionId: number;
  missions: Mission[];
  affectations: Affectation[];
}): { surveillantId: number; debut: string; fin: string }[] {
  const dateParMission = new Map(input.missions.map((m) => [m.id, m.dateMission]));
  const assignments: SupervisorAssignmentInput[] = input.affectations.flatMap((a) => {
    const date = dateParMission.get(a.missionId);
    if (!date) return [];
    const out: SupervisorAssignmentInput[] = [];
    creneauxDe(a, "matin").forEach((c, i) =>
      out.push({ id: `${a.id}-m-${i}`, sessionId: `${date}-matin`, roomId: `${a.missionId}:${a.salle ?? ""}`, supervisorId: String(a.surveillantId), startTime: c.debut, endTime: c.fin }));
    creneauxDe(a, "apres-midi").forEach((c, i) =>
      out.push({ id: `${a.id}-a-${i}`, sessionId: `${date}-apm`, roomId: `${a.missionId}:${a.salle ?? ""}`, supervisorId: String(a.surveillantId), startTime: c.debut, endTime: c.fin }));
    return out;
  });
  const dansSession = new Set(
    input.affectations.filter((a) => a.missionId === input.missionId).map((a) => String(a.surveillantId))
  );
  return detectSupervisorConflicts(assignments)
    .filter((c) => dansSession.has(c.supervisorId))
    .map((c) => ({ surveillantId: Number(c.supervisorId), debut: c.startTime, fin: c.endTime }));
}

// ---------------------------------------------------------------------------
// Suggestions du copilote (Page 3) — explicables, jamais appliquées seules
// ---------------------------------------------------------------------------

export type PrioriteSuggestion = "haute" | "moyenne" | "positive";

export interface SuggestionCopilote {
  id: string;
  titre: string;
  detail: string;
  priorite: PrioriteSuggestion;
  actionLabel: string;
  gainEuros?: number;
}

/**
 * Recommandations dérivées de l'état réel de la session. Chaque suggestion
 * porte sa raison et son impact (prompt §9) ; aucune n'est appliquée
 * automatiquement.
 */
export function suggestionsCopilote(input: {
  couverture: Couverture;
  rentabilite: Rentabilite;
  equilibrage: Equilibrage;
  sousEffectifs: SousEffectifSalle[];
  lignes: LigneAffectation[];
  tauxHoraireMoyen: number;
}): SuggestionCopilote[] {
  const out: SuggestionCopilote[] = [];

  if (input.couverture.manque > 0) {
    const cible = input.sousEffectifs[0];
    out.push({
      id: "mobiliser",
      titre: `Mobiliser ${input.couverture.manque} surveillant${input.couverture.manque > 1 ? "s" : ""}`,
      detail: cible
        ? `Couverture à ${Math.round(input.couverture.tauxCouverture * 100)} % · écart le plus marqué : salle ${cible.salle} (${cible.periode === "matin" ? "matin" : "après-midi"})`
        : `Couverture à ${Math.round(input.couverture.tauxCouverture * 100)} % — ${input.couverture.manque} poste(s) à pourvoir`,
      priorite: "haute",
      actionLabel: "Voir les profils",
    });
  }

  if (input.equilibrage.aRepartir > 0 && input.equilibrage.plusCharge) {
    out.push({
      id: "equilibrer",
      titre: "Rééquilibrer la charge",
      detail: `${input.equilibrage.plusCharge.nom} porte ${heuresFR(input.equilibrage.plusCharge.heures, 2)} · transférer ${heuresFR(input.equilibrage.aRepartir, 1)} ramènerait l'écart sous ± ${input.equilibrage.cible} h`,
      priorite: "moyenne",
      actionLabel: "Voir les remplacements",
    });
  }

  for (const l of input.lignes) {
    for (const a of l.alertes.filter((x) => x.code === "chevauchement" || x.code === "double-affectation")) {
      out.push({
        id: `conflit-${l.id}`,
        titre: l.salle ? `Conflit salle ${l.salle}` : `Conflit — ${l.nom}`,
        detail: a.texte,
        priorite: "haute",
        actionLabel: "Voir le conflit",
      });
    }
  }

  // Gain de marge d'un rééquilibrage : heures transférées vers un profil déjà
  // mobilisé, valorisées au taux horaire moyen constaté sur la session.
  if (input.equilibrage.aRepartir > 0 && input.rentabilite.caHT > 0) {
    const gain = Math.round(input.equilibrage.aRepartir * input.tauxHoraireMoyen * 100) / 100;
    if (gain > 0) {
      out.push({
        id: "marge",
        titre: "Optimisation marge",
        detail: `Redistribuer ${heuresFR(input.equilibrage.aRepartir, 1)} vers un surveillant disponible`,
        priorite: "positive",
        actionLabel: "Voir l'analyse",
        gainEuros: gain,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Vue consolidée d'une session
// ---------------------------------------------------------------------------

export interface VueSession {
  mission: Mission;
  lignes: LigneAffectation[];
  /** Salles distinctes réellement affectées. */
  nbSalles: number;
  /** Créneaux posés (matin + après-midi, toutes lignes). */
  nbCreneaux: number;
  minutesTotal: number;
  heuresTotal: number;
  heuresMoyenne: number;
  couverture: Couverture;
  rentabilite: Rentabilite;
  sante: SanteSession;
  alertes: AlerteLigne[];
  sousEffectifs: SousEffectifSalle[];
  equilibrage: Equilibrage;
  compteurs: Record<FiltreLigne, number>;
  suggestions: SuggestionCopilote[];
  /** Marge attendue après application du rééquilibrage proposé. */
  tauxMargeApres: number;
}

export function construireVueSession(input: {
  mission: Mission;
  missions: Mission[];
  affectations: Affectation[]; // TOUTES les affectations (conflits inter-missions)
  surveillants: Surveillant[];
}): VueSession {
  const { mission, missions, affectations, surveillants } = input;
  const survById = new Map(surveillants.map((s) => [s.id, s]));
  const propres = affectations.filter((a) => a.missionId === mission.id);
  const lignes = propres.map((a) => construireLigne(a, survById));

  // Conflits inter-missions : rattachés à la ligne du surveillant concerné.
  const parSurveillant = new Map(lignes.map((l) => [l.surveillantId, l]));
  for (const c of conflitsSession({ missionId: mission.id, missions, affectations })) {
    const l = parSurveillant.get(c.surveillantId);
    if (!l) continue;
    l.alertes.push({
      affectationId: l.id,
      code: "double-affectation",
      niveau: "critique",
      texte: `${l.nom} : double affectation le même jour (${c.debut}–${c.fin})`,
    });
  }

  const minutesTotal = lignes.reduce((n, l) => n + l.minutes, 0);
  const heuresTotal = enHeures(minutesTotal);
  const actives = lignes.filter((l) => l.minutes > 0);
  const affectes = new Set(actives.map((l) => l.surveillantId)).size;

  const couverture = analyseCouverture({ requis: mission.nbSurveillants, affectes });
  const rentabilite = analyseRentabilite({
    caHT: mission.montantHT,
    lignes: lignes.map((l) => ({ heures: l.heures, tauxHoraire: survById.get(l.surveillantId)?.tauxHoraire ?? 18 })),
  });
  const alertes = lignes.flatMap((l) => l.alertes);
  const sante = scoreSanteSession({
    tauxCouverture: couverture.tauxCouverture,
    manqueSurveillants: couverture.manque,
    tauxMarge: rentabilite.tauxMarge,
    margeNiveau: rentabilite.niveau,
    nbAlertes: alertes.length,
  });
  const equilibrage = equilibrageCharge(lignes);
  const sousEffectifs = sousEffectifsParSalle(lignes);
  const tauxHoraireMoyen = heuresTotal > 0 ? rentabilite.coutHT / heuresTotal : 0;

  const suggestions = suggestionsCopilote({
    couverture, rentabilite, equilibrage, sousEffectifs, lignes, tauxHoraireMoyen,
  });
  const gain = suggestions.find((s) => s.id === "marge")?.gainEuros ?? 0;
  const tauxMargeApres = rentabilite.caHT > 0
    ? Math.min(1, (rentabilite.margeHT + gain) / rentabilite.caHT)
    : rentabilite.tauxMarge;

  return {
    mission,
    lignes,
    nbSalles: new Set(lignes.map((l) => l.salle).filter(Boolean)).size,
    nbCreneaux: lignes.reduce((n, l) => n + l.matin.length + l.apm.length, 0),
    minutesTotal,
    heuresTotal,
    heuresMoyenne: actives.length ? heuresTotal / actives.length : 0,
    couverture,
    rentabilite,
    sante,
    alertes,
    sousEffectifs,
    equilibrage,
    compteurs: compteursFiltres(lignes),
    suggestions,
    tauxMargeApres,
  };
}

/** Sessions proposées dans le sélecteur, mission engagée en tête. */
export function sessionsSelectionnables(missions: Mission[]): Mission[] {
  const rang = (m: Mission) => (m.statut === "En cours" ? 0 : m.statut === "Validée" ? 1 : m.statut === "Planifiée" ? 2 : 3);
  return [...missions]
    .filter((m) => m.statut !== "Annulée")
    .sort((a, b) => rang(a) - rang(b) || (b.dateMission ?? "").localeCompare(a.dateMission ?? ""));
}

/**
 * Conserve la session courante dans un lien inter-pages. Helper PUR : il vit
 * ici et non dans le module de chargement, qui dépend de Supabase et ne doit
 * jamais être tiré dans un bundle client.
 */
export function lienSession(base: string, missionId?: number | null): string {
  return missionId == null ? base : `${base}?session=${missionId}`;
}

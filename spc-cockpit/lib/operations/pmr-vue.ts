// PMR & Tiers-temps — SOURCE DE VÉRITÉ UNIQUE de la page.
//
// Le modèle `Amenagement` ne porte volontairement AUCUNE donnée identifiant un
// étudiant (RGPD) et ne stocke ni horaire ni durée. Les deux sont donc DÉRIVÉS
// des créneaux réels de la salle sur la session active, et la durée majorée
// applique la règle métier du tiers-temps (+1/3).
//
// Rien n'est inventé : une salle sans créneau connu affiche « — » plutôt qu'un
// horaire plausible.
//
// Fonctions PURES et testables.

import type { Affectation, Amenagement, Creneau, Mission, Salle } from "./types";
import { creneauxDe, dureeMinutes, minutes } from "./planification-vue";

/**
 * Normalise un nom de salle pour la comparaison. Le référentiel Salles nomme
 * « Salle E31 » là où un aménagement porte « E31 » : sans cette normalisation
 * partagée, la cartographie et le tableau se contredisent sur le même écran.
 */
export function normaliserSalle(nom?: string | null): string {
  return (nom ?? "").trim().toLowerCase().replace(/^salle\s+/, "");
}

export function memeSalle(a?: string | null, b?: string | null): boolean {
  const na = normaliserSalle(a);
  return na.length > 0 && na === normaliserSalle(b);
}

// ---------------------------------------------------------------------------
// Règle métier du tiers-temps
// ---------------------------------------------------------------------------

/** Majoration réglementaire du tiers-temps : durée × 4/3. */
export const COEFFICIENT_TIERS_TEMPS = 4 / 3;

/** 140 → « 02h20 ». */
export function formatDuree(min: number): string {
  const m = Math.max(0, Math.round(min));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h${String(m % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Types de la vue
// ---------------------------------------------------------------------------

export type StatutAmenagement = "Isolé" | "Salle dédiée" | "Tiers-temps" | "Aménagement";
export type Conformite = "Conforme" | "À confirmer" | "Surv. manquant";

export interface LigneAmenagement {
  id: number;
  reference: string; // ETU-001 — code d'aménagement, jamais une donnée nominative
  libelle: string;
  salle: string;
  /** Amplitude réelle occupée par la salle sur la session, ou null si inconnue. */
  horaire: { debut: string; fin: string } | null;
  dureeMinutes: number; // 0 si l'horaire est inconnu
  dureeLabel: string;
  tiersTemps: boolean;
  surveillant: string | null;
  statut: StatutAmenagement;
  conformite: Conformite;
  /** Raison lisible de la non-conformité (vide si conforme). */
  motif: string;
}

export interface SalleAmenagee {
  id: number;
  nom: string;
  capacite: number;
  etudiants: number;
  occupation: number; // 0–1
  pmr: boolean;
  tiersTemps: boolean;
  surveillant: string | null;
  /** Une salle est « en cours » dès qu'un créneau y est planifié sur la session. */
  enCours: boolean;
  nbAmenagements: number;
}

export type NiveauAction = "critique" | "moyenne" | "surveiller";

export interface ActionImmediate {
  id: string;
  titre: string;
  detail: string;
  niveau: NiveauAction;
  ctaLabel: string;
  href: string;
}

export interface RepartitionPMR {
  pmr: { faits: number; total: number; taux: number };
  tiersTemps: { faits: number; total: number; taux: number };
  sallesDediees: { faits: number; total: number; taux: number };
  couvertureGlobale: number; // 0–1
}

export interface VuePMR {
  mission: Mission | null;
  lignes: LigneAmenagement[];
  salles: SalleAmenagee[];
  actions: ActionImmediate[];
  repartition: RepartitionPMR;
  /** KPI du bandeau clair. */
  nbAmenagements: number;
  nbSallesDediees: number;
  nbSallesActives: number;
  nbTiersTemps: number;
  dureeMoyenneLabel: string;
  nbActionsRequises: number;
  couverture: number; // 0–1
}

/** Objectif de couverture recommandé (bandeau KPI et widget). */
export const OBJECTIF_COUVERTURE = 0.9;

// ---------------------------------------------------------------------------
// Dérivations
// ---------------------------------------------------------------------------

/** Référence d'affichage, dérivée de l'identifiant réel. */
export function referenceAmenagement(id: number): string {
  return `ETU-${String(id).padStart(3, "0")}`;
}

export function statutAmenagement(a: Amenagement, salle?: Salle): StatutAmenagement {
  const libelle = a.amenagement.toLowerCase();
  if (libelle.includes("isol")) return "Isolé";
  if (libelle.startsWith("pmr") || (salle?.pmr && !a.tiersTemps)) return "Salle dédiée";
  if (a.tiersTemps) return "Tiers-temps";
  return "Aménagement";
}

/**
 * Créneaux de surveillance réellement planifiés sur une salle, dédoublonnés et
 * triés par heure de début. On expose les créneaux tels quels : prendre
 * l'amplitude du premier début au dernier fin donnerait une « durée » de
 * plusieurs heures pour une salle utilisée matin ET après-midi, ce qui ne
 * correspond à aucune épreuve.
 */
export function creneauxSalle(salle: string, affectations: Affectation[]): Creneau[] {
  const vus = new Set<string>();
  return affectations
    .filter((a) => memeSalle(a.salle, salle))
    .flatMap((a) => [...creneauxDe(a, "matin"), ...creneauxDe(a, "apres-midi")])
    .filter((c) => dureeMinutes(c) > 0)
    .filter((c) => {
      const cle = `${c.debut}-${c.fin}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .sort((x, y) => (minutes(x.debut) ?? 0) - (minutes(y.debut) ?? 0));
}

/** Durée effective : amplitude de l'épreuve, majorée d'1/3 en tiers-temps. */
export function dureeEffectiveMinutes(horaire: { debut: string; fin: string } | null, tiersTemps: boolean): number {
  if (!horaire) return 0;
  const base = dureeMinutes(horaire);
  return Math.round(tiersTemps ? base * COEFFICIENT_TIERS_TEMPS : base);
}

/**
 * Conformité opérationnelle d'un aménagement :
 *  - « Surv. manquant » : aucun surveillant dédié affecté (bloquant) ;
 *  - « À confirmer » : la salle est absente du référentiel, ou n'est pas
 *    marquée PMR / tiers-temps alors que l'aménagement l'exige ;
 *  - « Conforme » sinon.
 */
export function conformiteAmenagement(a: Amenagement, salle?: Salle): { conformite: Conformite; motif: string } {
  if (!a.surveillant?.trim()) {
    return { conformite: "Surv. manquant", motif: "Aucun surveillant dédié affecté à cet aménagement." };
  }
  if (!a.salle?.trim()) {
    return { conformite: "À confirmer", motif: "Aucune salle affectée à cet aménagement." };
  }
  if (!salle) {
    return { conformite: "À confirmer", motif: `La salle ${a.salle} n'est pas encore déclarée dans le référentiel.` };
  }
  const exigePMR = a.amenagement.toLowerCase().startsWith("pmr");
  if (exigePMR && !salle.pmr) {
    return { conformite: "À confirmer", motif: `La salle ${salle.nom} n'est pas marquée PMR.` };
  }
  if (a.tiersTemps && !salle.tiersTemps) {
    return { conformite: "À confirmer", motif: `La salle ${salle.nom} n'est pas marquée tiers-temps.` };
  }
  return { conformite: "Conforme", motif: "" };
}

/**
 * Chevauchements horaires entre deux aménagements confiés au MÊME surveillant
 * dédié : un surveillant ne peut pas couvrir deux salles au même moment.
 */
export function conflitsAmenagement(lignes: LigneAmenagement[]): { a: LigneAmenagement; b: LigneAmenagement }[] {
  const out: { a: LigneAmenagement; b: LigneAmenagement }[] = [];
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i];
      const b = lignes[j];
      if (!a.surveillant || a.surveillant !== b.surveillant) continue;
      if (!a.horaire || !b.horaire) continue;
      if (a.salle.toLowerCase() === b.salle.toLowerCase()) continue; // même salle : pas un conflit
      const debutA = minutes(a.horaire.debut) ?? 0;
      const finA = minutes(a.horaire.fin) ?? 0;
      const debutB = minutes(b.horaire.debut) ?? 0;
      const finB = minutes(b.horaire.fin) ?? 0;
      if (debutA < finB && debutB < finA) out.push({ a, b });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vue consolidée
// ---------------------------------------------------------------------------

export function construireVuePMR(input: {
  amenagements: Amenagement[];
  salles: Salle[];
  affectations: Affectation[];
  mission: Mission | null;
}): VuePMR {
  const { amenagements, salles, mission } = input;
  const affectations = mission ? input.affectations.filter((a) => a.missionId === mission.id) : [];
  const trouverSalle = (nom?: string): Salle | undefined =>
    nom?.trim() ? salles.find((s) => memeSalle(s.nom, nom)) : undefined;

  // Un aménagement occupe UN créneau. Quand une salle en compte plusieurs, on
  // les attribue dans l'ordre aux aménagements de cette salle (le 1er créneau
  // au 1er aménagement, etc.) plutôt que d'agréger toute la journée.
  const rangDansSalle = new Map<number, number>();
  const compteur = new Map<string, number>();
  for (const a of amenagements) {
    const cle = normaliserSalle(a.salle);
    const n = compteur.get(cle) ?? 0;
    rangDansSalle.set(a.id, n);
    compteur.set(cle, n + 1);
  }

  const lignes: LigneAmenagement[] = amenagements.map((a) => {
    const salle = trouverSalle(a.salle);
    const creneaux = a.salle ? creneauxSalle(a.salle, affectations) : [];
    const horaire = creneaux.length > 0 ? creneaux[(rangDansSalle.get(a.id) ?? 0) % creneaux.length] : null;
    const duree = dureeEffectiveMinutes(horaire, a.tiersTemps);
    const { conformite, motif } = conformiteAmenagement(a, salle);
    return {
      id: a.id,
      reference: referenceAmenagement(a.id),
      libelle: a.amenagement,
      salle: a.salle ?? "",
      horaire,
      dureeMinutes: duree,
      dureeLabel: duree > 0 ? formatDuree(duree) : "—",
      tiersTemps: a.tiersTemps,
      surveillant: a.surveillant?.trim() || null,
      statut: statutAmenagement(a, salle),
      conformite,
      motif,
    };
  });

  // ── Cartographie des salles ───────────────────────────────────────────────
  const sallesDediees = salles.filter((s) => s.pmr || s.tiersTemps);
  const cartographie: SalleAmenagee[] = sallesDediees.map((s) => {
    const surSalle = affectations.filter((a) => memeSalle(a.salle, s.nom));
    const enCours = surSalle.some((a) => creneauxDe(a, "matin").length > 0 || creneauxDe(a, "apres-midi").length > 0);
    return {
      id: s.id,
      nom: s.nom,
      capacite: s.capacite,
      etudiants: s.etudiants,
      occupation: s.capacite > 0 ? s.etudiants / s.capacite : 0,
      pmr: s.pmr,
      tiersTemps: s.tiersTemps,
      surveillant: null, // renseigné juste après depuis les aménagements
      enCours,
      nbAmenagements: lignes.filter((l) => memeSalle(l.salle, s.nom)).length,
    };
  });
  for (const c of cartographie) {
    c.surveillant = lignes.find((l) => memeSalle(l.salle, c.nom) && l.surveillant)?.surveillant ?? null;
  }

  // ── Actions immédiates (uniquement des écarts mesurés) ────────────────────
  const actions: ActionImmediate[] = [];
  const sansSurveillant = lignes.filter((l) => l.conformite === "Surv. manquant");
  if (sansSurveillant.length > 0) {
    actions.push({
      id: "surveillant-manquant",
      titre: "Surveillant dédié manquant",
      detail: `${sansSurveillant.length} aménagement${sansSurveillant.length > 1 ? "s nécessitent" : " nécessite"} un surveillant dédié non affecté.`,
      niveau: "critique",
      ctaLabel: "Affecter",
      href: "/operations/planification/planning",
    });
  }
  const aConfirmer = lignes.filter((l) => l.conformite === "À confirmer");
  if (aConfirmer.length > 0) {
    actions.push({
      id: "salle-a-valider",
      titre: "Salle à valider",
      detail: `${aConfirmer.length} salle${aConfirmer.length > 1 ? "s dédiées n'ont" : " dédiée n'a"} pas encore été validée par le responsable.`,
      niveau: "moyenne",
      ctaLabel: "Valider",
      href: "/operations/salles",
    });
  }
  const conflits = conflitsAmenagement(lignes);
  if (conflits.length > 0) {
    actions.push({
      id: "conflit-amenagement",
      titre: "Conflit d'aménagement potentiel",
      detail: `Risque de chevauchement horaire entre ${conflits.length * 2} aménagements confiés au même surveillant.`,
      niveau: "surveiller",
      ctaLabel: "Voir détails",
      href: "/operations/planification/planning",
    });
  }

  // ── Répartition & couverture ──────────────────────────────────────────────
  const total = lignes.length;
  const lignesPMR = lignes.filter((l) => l.libelle.toLowerCase().startsWith("pmr") || l.statut === "Salle dédiée");
  const lignesTT = lignes.filter((l) => l.tiersTemps);
  const conformes = lignes.filter((l) => l.conformite === "Conforme").length;
  const sallesConformes = cartographie.filter((s) =>
    lignes.some((l) => memeSalle(l.salle, s.nom) && l.conformite === "Conforme")
  ).length;

  const taux = (n: number, d: number) => (d > 0 ? n / d : 0);
  const repartition: RepartitionPMR = {
    pmr: { faits: lignesPMR.filter((l) => l.conformite === "Conforme").length, total, taux: taux(lignesPMR.filter((l) => l.conformite === "Conforme").length, total) },
    tiersTemps: { faits: lignesTT.filter((l) => l.conformite === "Conforme").length, total, taux: taux(lignesTT.filter((l) => l.conformite === "Conforme").length, total) },
    sallesDediees: { faits: sallesConformes, total: sallesDediees.length, taux: taux(sallesConformes, sallesDediees.length) },
    couvertureGlobale: taux(conformes, total),
  };

  const dureeMoyenne = lignes.filter((l) => l.dureeMinutes > 0);
  const moyenne = dureeMoyenne.length
    ? dureeMoyenne.reduce((n, l) => n + l.dureeMinutes, 0) / dureeMoyenne.length
    : 0;

  return {
    mission,
    lignes,
    salles: cartographie,
    actions,
    repartition,
    nbAmenagements: total,
    nbSallesDediees: sallesDediees.length,
    nbSallesActives: cartographie.filter((s) => s.enCours).length,
    nbTiersTemps: lignesTT.length,
    dureeMoyenneLabel: moyenne > 0 ? formatDuree(moyenne) : "—",
    nbActionsRequises: lignes.filter((l) => l.conformite !== "Conforme").length,
    couverture: repartition.couvertureGlobale,
  };
}

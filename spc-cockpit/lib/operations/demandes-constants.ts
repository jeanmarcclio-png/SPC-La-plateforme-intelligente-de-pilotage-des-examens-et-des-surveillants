// Helpers purs du module « Demandes client » — importables côté client comme
// serveur (aucune dépendance Supabase / server-only ici).

import type { DemandeClient, DemandeSalle, StatutDemande } from "./types";

export const STATUTS_DEMANDE: StatutDemande[] = [
  "Brouillon",
  "À vérifier",
  "Complète",
  "À corriger",
  "Validée SPC",
  "Convertie en mission",
  "Archivée",
  "Annulée",
];

/** Métadonnées d'affichage par statut : libellé, couleurs de pastille. */
export const STATUT_META: Record<StatutDemande, { pill: string; dot: string }> = {
  "Brouillon":            { pill: "bg-gray-100 text-gray-600",       dot: "#a0aec0" },
  "À vérifier":           { pill: "bg-amber-50 text-amber-700",      dot: "#f6ad55" },
  "Complète":             { pill: "bg-blue-50 text-blue-700",        dot: "#4a90d9" },
  "À corriger":           { pill: "bg-red-50 text-red-600",          dot: "#fc8181" },
  "Validée SPC":          { pill: "bg-teal-50 text-[var(--color-primary)]", dot: "#0f766e" },
  "Convertie en mission": { pill: "bg-indigo-50 text-indigo-700",    dot: "#667eea" },
  "Archivée":             { pill: "bg-gray-100 text-gray-400",       dot: "#cbd5e0" },
  "Annulée":              { pill: "bg-gray-100 text-gray-400 line-through", dot: "#cbd5e0" },
};

/** Suggestions de besoins particuliers (spec §8.3). */
export const BESOINS_SUGGESTIONS = [
  "Placement particulier", "Salle isolée", "Matériel spécifique", "Accès bâtiment",
  "Consignes particulières", "Présence coordinateur", "Contrôle d'identité",
  "Émargement", "Interdiction téléphone", "Documents à distribuer", "Collecte copies",
];

/** Référence lisible générée à la création : DC-AAAA-XXXX. */
export function generateDemandeReference(now: Date = new Date()): string {
  const y = now.getFullYear();
  const suffix = (now.getTime() % 10000).toString().padStart(4, "0");
  return `DC-${y}-${suffix}`;
}

function contactRenseigne(c: { nom?: string; email?: string }): boolean {
  return Boolean(c.nom?.trim() && c.email?.trim());
}

/**
 * Contrôles bloquants avant passage en « Validée SPC » (spec §12).
 * Retourne la liste des éléments à corriger (vide = validable).
 */
export function validateDemande(d: DemandeClient): string[] {
  const errors: string[] = [];
  if (!d.etablissement?.trim()) errors.push("Établissement non renseigné");
  if (!contactRenseigne(d.demandeur)) errors.push("Demandeur incomplet (nom + email requis)");
  if (!contactRenseigne(d.responsableClient)) errors.push("Responsable client incomplet (nom + email requis)");
  if (!d.responsableSpc?.nom?.trim()) errors.push("Responsable SPC non renseigné");

  const salles = d.salles.filter((s) => s.salle?.trim());
  if (salles.length === 0) errors.push("Aucune salle renseignée");
  if (!salles.some((s) => s.dateExamen)) errors.push("Aucune date d'examen renseignée");

  for (const s of salles) {
    if (s.debutSurveillance && s.finSurveillance && s.debutSurveillance >= s.finSurveillance) {
      errors.push(`Salle ${s.salle} : horaire de surveillance incohérent`);
    }
    if (s.etudiants <= 0) errors.push(`Salle ${s.salle} : effectif étudiants manquant`);
    if (s.surveillants <= 0) errors.push(`Salle ${s.salle} : nombre de surveillants manquant`);
  }

  if (d.pmrPresent && d.pmrNombre <= 0) errors.push("PMR signalé mais effectif non renseigné");
  if (d.tiersTempsPresent && d.tiersTempsNombre <= 0) errors.push("Tiers-temps signalé mais effectif non renseigné");

  return errors;
}

/**
 * Mapping demande → mission (spec §13). Statut initial « À chiffrer ».
 * Champs snake_case prêts pour l'insert Supabase. Aucun calcul financier ici.
 */
export function buildMissionFromDemande(d: DemandeClient) {
  const salles = d.salles.filter((s) => s.salle?.trim());
  const dates = salles.map((s) => s.dateExamen).filter(Boolean).sort() as string[];
  return {
    reference: d.reference,
    client: d.etablissement,
    date_mission: dates[0] ?? null,
    type: "Examen écrit",
    nb_salles: salles.length,
    nb_surveillants: salles.reduce((s, x) => s + (x.surveillants || 0), 0),
    montant_ht: 0,
    statut: "À chiffrer",
    notes: `Issue de la demande ${d.reference}${d.observations ? " — " + d.observations : ""}`,
  };
}

// ─── Import / copier-coller depuis Excel (spec §9 & §10) ─────────────────────

const TRUE_VALUES = new Set(["oui", "o", "x", "1", "true", "vrai", "yes"]);
const isTrue = (v: string) => TRUE_VALUES.has(v.trim().toLowerCase());

/** Date française (12/01/2026) ou ISO (2026-01-12) → ISO ; sinon "". */
export function normalizeDate(raw: string): string {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

function normalizeCreneau(raw: string): "matin" | "apres-midi" {
  return /(apr|pm|midi|a-?m)/i.test(raw) && !/matin/i.test(raw) ? "apres-midi" : "matin";
}

/**
 * Parse un collage / CSV en lignes de salles. Colonnes (positionnelles) :
 * Date | Créneau | Salle | Bâtiment | Étudiants | Surveillants | PMR | Tiers-temps
 * | Début examen | Fin examen | Début surveillance | Fin surveillance | Observations.
 * Détecte le séparateur (tab, ;, ,). Ne renvoie jamais silencieusement des
 * lignes invalides : les erreurs sont listées séparément.
 */
export function parseSallesFromText(text: string): { salles: DemandeSalle[]; errors: string[] } {
  const salles: DemandeSalle[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, i) => {
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map((c) => c.trim());
    // Ignore une éventuelle ligne d'en-tête.
    if (/date/i.test(cols[0]) && /salle/i.test(cols[2] ?? "")) return;

    const salle = (cols[2] ?? "").toUpperCase();
    if (!salle) { errors.push(`Ligne ${i + 1} : salle manquante`); return; }

    const etudiants = Number(cols[4] ?? 0) || 0;
    const surveillants = Number(cols[5] ?? 1) || 1;
    if (etudiants <= 0) errors.push(`Ligne ${i + 1} (${salle}) : effectif étudiants manquant`);

    salles.push({
      dateExamen: normalizeDate(cols[0] ?? ""),
      creneau: normalizeCreneau(cols[1] ?? ""),
      salle,
      batiment: cols[3] || undefined,
      etudiants,
      surveillants,
      pmr: isTrue(cols[6] ?? ""),
      tiersTemps: isTrue(cols[7] ?? ""),
      debutExamen: cols[8] || undefined,
      finExamen: cols[9] || undefined,
      debutSurveillance: cols[10] || undefined,
      finSurveillance: cols[11] || undefined,
      observations: cols[12] || undefined,
      ordre: salles.length + 1,
    });
  });

  return { salles, errors };
}

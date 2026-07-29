// Helpers purs du module « Demandes client » — importables côté client comme
// serveur (aucune dépendance Supabase / server-only ici).

import type { Contact, DemandeClient, DemandeSalle, StatutDemande } from "./types";

export const STATUTS_DEMANDE: StatutDemande[] = [
  "Brouillon interne",
  "Lien envoyé client",
  "Brouillon client",
  "Soumise par client",
  "Importée depuis Excel",
  "À vérifier SPC",
  "À corriger",
  "Complète",
  "Validée SPC",
  "Convertie en mission",
  "Archivée",
  "Annulée",
  "Expirée",
];

/** Métadonnées d'affichage par statut : couleurs de pastille. */
export const STATUT_META: Record<StatutDemande, { pill: string; dot: string }> = {
  "Brouillon interne":    { pill: "bg-gray-100 text-gray-600",       dot: "#a0aec0" },
  "Lien envoyé client":   { pill: "bg-sky-50 text-sky-700",          dot: "#38bdf8" },
  "Brouillon client":     { pill: "bg-sky-50 text-sky-600",          dot: "#7dd3fc" },
  "Soumise par client":   { pill: "bg-indigo-50 text-indigo-700",    dot: "#667eea" },
  "Importée depuis Excel":{ pill: "bg-blue-50 text-blue-700",        dot: "#4a90d9" },
  "À vérifier SPC":       { pill: "bg-amber-50 text-amber-700",      dot: "#f6ad55" },
  "À corriger":           { pill: "bg-red-50 text-red-600",          dot: "#fc8181" },
  "Complète":             { pill: "bg-blue-50 text-blue-700",        dot: "#4a90d9" },
  "Validée SPC":          { pill: "bg-teal-50 text-[var(--color-primary)]", dot: "#0f766e" },
  "Convertie en mission": { pill: "bg-indigo-50 text-indigo-700",    dot: "#667eea" },
  "Archivée":             { pill: "bg-gray-100 text-gray-400",       dot: "#cbd5e0" },
  "Annulée":              { pill: "bg-gray-100 text-gray-400 line-through", dot: "#cbd5e0" },
  "Expirée":              { pill: "bg-gray-100 text-gray-500",       dot: "#cbd5e0" },
};

/** Statuts depuis lesquels une validation SPC est encore possible. */
export const STATUT_NON_VALIDABLE: StatutDemande[] = ["Validée SPC", "Convertie en mission", "Annulée", "Archivée", "Expirée"];

/** Statuts verrouillés : la fiche ne peut plus être éditée côté SPC. */
export const STATUTS_VERROUILLES: StatutDemande[] = ["Convertie en mission", "Annulée", "Archivée", "Expirée"];

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailValide = (e?: string) => !e?.trim() || EMAIL_RE.test(e.trim());

export interface DemandeEvaluation {
  erreurs: string[];       // bloquant : empêche la validation SPC
  avertissements: string[];// non bloquant : vérification recommandée
  infos: string[];         // purement informatif
}

/**
 * Contrôle à trois niveaux (spec §9) : erreur bloquante, avertissement, info.
 * La validation SPC n'est possible que si `erreurs` est vide.
 */
export function evaluateDemande(d: DemandeClient): DemandeEvaluation {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const infos: string[] = [];

  // ── Erreurs bloquantes ──
  if (!d.etablissement?.trim()) erreurs.push("Établissement non renseigné");
  if (!contactRenseigne(d.demandeur)) erreurs.push("Demandeur incomplet (nom + email requis)");
  if (!contactRenseigne(d.responsableClient)) erreurs.push("Responsable client incomplet (nom + email requis)");
  if (!d.responsableSpc?.nom?.trim()) erreurs.push("Responsable SPC non renseigné");
  if (!emailValide(d.demandeur.email)) erreurs.push("Email du demandeur invalide");
  if (!emailValide(d.responsableClient.email)) erreurs.push("Email du responsable client invalide");

  const salles = d.salles.filter((s) => s.salle?.trim());
  if (salles.length === 0) erreurs.push("Aucune salle renseignée");
  if (!salles.some((s) => s.dateExamen)) erreurs.push("Aucune date d'examen renseignée");
  for (const s of salles) {
    if (s.debutSurveillance && s.finSurveillance && s.debutSurveillance >= s.finSurveillance) {
      erreurs.push(`Salle ${s.salle} : horaire de surveillance incohérent`);
    }
    if (s.etudiants <= 0) erreurs.push(`Salle ${s.salle} : effectif étudiants manquant`);
    if (s.surveillants <= 0) erreurs.push(`Salle ${s.salle} : nombre de surveillants manquant`);
  }
  if (d.pmrPresent && d.pmrNombre <= 0) erreurs.push("PMR signalé mais effectif non renseigné");
  if (d.tiersTempsPresent && d.tiersTempsNombre <= 0) erreurs.push("Tiers-temps signalé mais effectif non renseigné");

  // ── Avertissements (vérification recommandée) ──
  if (!d.demandeur.telephone?.trim()) avertissements.push("Téléphone du demandeur absent");
  if (!d.referenceClient?.trim()) avertissements.push("Référence client absente");
  if (salles.some((s) => !s.batiment?.trim())) avertissements.push("Bâtiment absent sur au moins une salle");
  if (d.pmrPresent && !d.pmrDetails?.trim()) avertissements.push("PMR signalé mais détails incomplets");
  if (!d.observations?.trim()) avertissements.push("Observations non renseignées");

  // ── Informations (non bloquant) ──
  if (!d.demandeur.service?.trim()) infos.push("Service du demandeur non précisé");
  if (!d.campus?.trim()) infos.push("Campus / site non précisé");

  return { erreurs, avertissements, infos };
}

/** Sous-ensemble bloquant (compat) : liste des erreurs à corriger. */
export function validateDemande(d: DemandeClient): string[] {
  return evaluateDemande(d).erreurs;
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

// ─── Pièces jointes (spec §7.7, §18) ─────────────────────────────────────────

export const PIECES_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
export const PIECES_BUCKET = "demandes-pieces";
/** Attribut `accept` de l'input fichier + validation d'extension. */
export const PIECES_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.csv";
const PIECES_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "xlsx", "xls", "docx", "csv"]);

/** Nom de fichier sûr : sans chemin ni caractères spéciaux, extension conservée. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "fichier";
  return base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+|-+$/g, "").slice(0, 120) || "fichier";
}

/** Chemin Storage : {org}/{demande}/{timestamp}-{fichier}. */
export function piecePath(orgId: string, demandeId: number, name: string, now: Date = new Date()): string {
  return `${orgId}/${demandeId}/${now.getTime()}-${sanitizeFilename(name)}`;
}

/** Contrôle taille + type d'une pièce. Retourne un message d'erreur ou null. */
export function validatePieceMeta(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return "Fichier vide.";
  if (file.size > PIECES_MAX_BYTES) return `Fichier trop volumineux (max ${Math.round(PIECES_MAX_BYTES / 1024 / 1024)} Mo).`;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!PIECES_EXT.has(ext)) return `Format non accepté (.${ext}). Autorisés : ${[...PIECES_EXT].join(", ")}.`;
  return null;
}

/** Taille lisible (Ko / Mo). */
export function formatTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
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

/** Normalise un libellé pour comparaison : minuscules, sans accents ni ponctuation. */
function normLabel(raw: string): string {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface ModeleInfos {
  etablissement: string;
  campus?: string;
  ville?: string;
  typeEtablissement?: string;
  referenceClient?: string;
  observations?: string;
  demandeur: Contact;
  responsableClient: Contact;
}

/** Renseigne un sous-champ de contact selon le libellé (prénom, nom, email…). */
function assignContactField(c: Contact, label: string, value: string) {
  if (label.includes("prenom")) c.prenom = value;
  else if (label.includes("fonction")) c.fonction = value;
  else if (label.includes("mail")) c.email = value;
  else if (label.includes("tel")) c.telephone = value;
  else if (label.includes("service")) c.service = value;
  else if (label.includes("nom")) c.nom = value;
}

/**
 * Extrait les informations générales depuis l'onglet « Établissement & contacts »
 * du modèle (spec §10.2). Entrée : lignes AoA (Champ | Valeur). Tolérant aux
 * variantes de libellés et à l'ordre des lignes.
 */
export function parseModeleInfos(rows: (string | number)[][]): ModeleInfos {
  const out: ModeleInfos = { etablissement: "", demandeur: {}, responsableClient: {} };
  for (const row of rows) {
    const label = normLabel(String(row[0] ?? ""));
    const value = String(row[1] ?? "").trim();
    if (!label || !value) continue;
    if (label === "champ") continue; // ligne d'en-tête

    if (label.startsWith("demandeur")) { assignContactField(out.demandeur, label, value); continue; }
    if (label.startsWith("responsable client") || label.startsWith("resp client")) { assignContactField(out.responsableClient, label, value); continue; }
    if (label.startsWith("type")) { out.typeEtablissement = value; continue; }
    if (label.includes("etablissement")) { out.etablissement = value; continue; }
    if (label.includes("campus") || label.includes("site")) { out.campus = value; continue; }
    if (label.includes("ville")) { out.ville = value; continue; }
    if (label.includes("reference")) { out.referenceClient = value; continue; }
    if (label.includes("observation")) { out.observations = value; continue; }
  }
  return out;
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

// Mapping + validation + détection de doublons pour l'import de surveillants.
// Fonctions pures (testables). Le modèle SPC stocke un `nom` complet ; on
// combine Prénom + Nom. Les champs sans colonne dédiée (dispo, zone) sont
// conservés dans `qualifications` pour ne rien perdre.

export interface ImportedSurveillant {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  role: string;
  dispoMatin: string;
  dispoApm: string;
  statut: string;
  zone: string;
  observations: string;
}

export interface PreviewRow {
  data: ImportedSurveillant;
  nomComplet: string;
  qualifications: string;
  statutNormalise: string;
  errors: string[]; // bloquants
  duplicate: boolean;
  valid: boolean;
}

export interface ImportPreview {
  rows: PreviewRow[];
  total: number;
  valides: number;
  aCorriger: number;
  doublons: number;
}

const STATUTS = ["Disponible", "Planifié", "Annulé", "Indisponible"] as const;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s: string): string {
  return stripAccents((s ?? "").trim().toLowerCase());
}

/** Statut libre → statut SPC (défaut « Disponible », « Actif » compris). */
export function normalizeStatut(raw: string): string {
  const r = norm(raw);
  if (!r || r === "actif" || r.startsWith("dispo")) return "Disponible";
  if (r.startsWith("planif")) return "Planifié";
  if (r.startsWith("annul")) return "Annulé";
  if (r.startsWith("indispo") || r === "inactif") return "Indisponible";
  return "Disponible";
}

export function isValidEmail(email: string): boolean {
  if (!email) return true; // email non obligatoire
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
export function isValidPhone(tel: string): boolean {
  if (!tel) return true; // téléphone non obligatoire
  return (tel.match(/\d/g) ?? []).length >= 8;
}

// En-têtes reconnus → clé interne
const HEADER_MAP: Record<string, keyof ImportedSurveillant> = {
  "prenom": "prenom",
  "nom": "nom",
  "telephone": "telephone", "tel": "telephone", "portable": "telephone", "mobile": "telephone",
  "email": "email", "mail": "email", "courriel": "email", "e-mail": "email",
  "role": "role", "fonction": "role",
  "disponibilite matin": "dispoMatin", "dispo matin": "dispoMatin",
  "disponibilite apres-midi": "dispoApm", "dispo apres-midi": "dispoApm", "disponibilite apres midi": "dispoApm",
  "statut": "statut",
  "zone": "zone", "secteur": "zone",
  "observations": "observations", "remarque": "observations", "remarques": "observations", "note": "observations",
};

// Ordre positionnel de repli (A→J) si les en-têtes ne sont pas reconnus.
const POSITIONAL: (keyof ImportedSurveillant)[] = [
  "prenom", "nom", "telephone", "email", "role", "dispoMatin", "dispoApm", "statut", "zone", "observations",
];

function emptyRow(): ImportedSurveillant {
  return { prenom: "", nom: "", telephone: "", email: "", role: "", dispoMatin: "", dispoApm: "", statut: "", zone: "", observations: "" };
}

/** Détermine, à partir de la ligne d'en-tête, l'index de chaque champ. */
function resolveColumns(header: string[]): { map: (keyof ImportedSurveillant | null)[]; recognized: boolean } {
  const map = header.map((h) => HEADER_MAP[norm(h)] ?? null);
  const recognized = map.some((m) => m === "prenom" || m === "nom");
  if (recognized) return { map, recognized: true };
  // repli positionnel
  return { map: header.map((_, i) => POSITIONAL[i] ?? null), recognized: false };
}

/**
 * Construit l'aperçu d'import à partir des lignes CSV brutes (1re ligne = en-tête)
 * et de la liste des surveillants existants (pour la détection de doublons).
 */
export function buildImportPreview(
  rawRows: string[][],
  existing: { nom: string; email?: string | null; telephone?: string | null }[]
): ImportPreview {
  if (rawRows.length === 0) return { rows: [], total: 0, valides: 0, aCorriger: 0, doublons: 0 };

  const [header, ...body] = rawRows;
  const { map } = resolveColumns(header);

  const existNoms = new Set(existing.map((e) => norm(e.nom)));
  const existEmails = new Set(existing.map((e) => norm(e.email ?? "")).filter(Boolean));
  const existTels = new Set(existing.map((e) => (e.telephone ?? "").replace(/\D/g, "")).filter(Boolean));

  const rows: PreviewRow[] = body.map((cells) => {
    const data = emptyRow();
    cells.forEach((cell, i) => {
      const key = map[i];
      if (key) data[key] = (cell ?? "").trim();
    });

    const nomComplet = [data.prenom, data.nom].filter(Boolean).join(" ").trim();
    const statutNormalise = normalizeStatut(data.statut);
    const qualifications = [
      data.observations,
      data.zone ? `Zone : ${data.zone}` : "",
      data.dispoMatin ? `Matin : ${data.dispoMatin}` : "",
      data.dispoApm ? `Après-midi : ${data.dispoApm}` : "",
    ].filter(Boolean).join(" · ");

    const errors: string[] = [];
    if (!nomComplet) errors.push("Nom manquant");
    if (!isValidEmail(data.email)) errors.push("Email invalide");
    if (!isValidPhone(data.telephone)) errors.push("Téléphone invalide");

    const duplicate =
      (!!nomComplet && existNoms.has(norm(nomComplet))) ||
      (!!data.email && existEmails.has(norm(data.email))) ||
      (!!data.telephone && existTels.has(data.telephone.replace(/\D/g, "")));

    return { data, nomComplet, qualifications, statutNormalise, errors, duplicate, valid: errors.length === 0 };
  });

  return {
    rows,
    total: rows.length,
    valides: rows.filter((r) => r.valid && !r.duplicate).length,
    aCorriger: rows.filter((r) => !r.valid).length,
    doublons: rows.filter((r) => r.duplicate).length,
  };
}

export { STATUTS };

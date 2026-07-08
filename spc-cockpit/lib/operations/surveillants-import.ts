// Mapping + validation + détection de doublons pour l'import de surveillants.
// Fonctions pures (testables). Deux formats gérés :
//  1. annuaire « Contacts Surveillants » (Prénom, Nom, Téléphone…) ;
//  2. planning d'examens (colonne « SURVEILLANT » = nom complet, répété sur
//     plusieurs lignes) → on extrait les noms UNIQUES.
// Le modèle SPC stocke un `nom` complet ; les champs sans colonne dédiée
// (dispo, zone) sont conservés dans `qualifications`.

export interface ImportedSurveillant {
  prenom: string;
  nom: string;
  fullname: string; // colonne unique « SURVEILLANT » / « Nom complet »
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
  errors: string[];
  duplicate: boolean; // doublon avec l'existant OU répétition interne au fichier
  valid: boolean;
}

export interface ImportPreview {
  rows: PreviewRow[];
  total: number; // lignes de données lues
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

/**
 * Nettoie un nom de planning : retire la civilité en tête (« M. Clio » → « Clio »)
 * et les marqueurs d'absence en fin (« Clio Jean Marc ABS » → « Clio Jean Marc »),
 * puis normalise les espaces.
 */
export function stripCivility(name: string): string {
  return (name ?? "")
    .trim()
    .replace(/^(m\.|mr\.?|mme\.?|mlle\.?|dr\.?)\s*/i, "")
    .replace(/\s*\(?\b(abs|absent[e]?|excuse[ée]?)\b\)?\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStatut(raw: string): string {
  const r = norm(raw);
  if (!r || r === "actif" || r.startsWith("dispo")) return "Disponible";
  if (r.startsWith("planif") || r.startsWith("present")) return "Planifié";
  if (r.startsWith("annul")) return "Annulé";
  if (r.startsWith("indispo") || r === "inactif" || r.startsWith("absent")) return "Indisponible";
  return "Disponible";
}

export function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
export function isValidPhone(tel: string): boolean {
  if (!tel) return true;
  return (tel.match(/\d/g) ?? []).length >= 8;
}

const HEADER_MAP: Record<string, keyof ImportedSurveillant> = {
  "prenom": "prenom",
  "nom": "nom",
  "surveillant": "fullname", "surveillant·e": "fullname", "nom du surveillant": "fullname",
  "nom complet": "fullname", "nom prenom": "fullname", "prenom nom": "fullname", "agent": "fullname",
  "telephone": "telephone", "tel": "telephone", "portable": "telephone", "mobile": "telephone",
  "email": "email", "mail": "email", "courriel": "email", "e-mail": "email",
  "role": "role", "fonction": "role",
  "disponibilite matin": "dispoMatin", "dispo matin": "dispoMatin",
  "disponibilite apres-midi": "dispoApm", "dispo apres-midi": "dispoApm", "disponibilite apres midi": "dispoApm",
  "statut": "statut", "presence": "statut",
  "zone": "zone", "secteur": "zone",
  "observations": "observations", "remarque": "observations", "remarques": "observations", "note": "observations",
};

const POSITIONAL: (keyof ImportedSurveillant)[] = [
  "prenom", "nom", "telephone", "email", "role", "dispoMatin", "dispoApm", "statut", "zone", "observations",
];

function emptyRow(): ImportedSurveillant {
  return { prenom: "", nom: "", fullname: "", telephone: "", email: "", role: "", dispoMatin: "", dispoApm: "", statut: "", zone: "", observations: "" };
}

function mapHeader(header: string[]): (keyof ImportedSurveillant | null)[] {
  return header.map((h) => HEADER_MAP[norm(h)] ?? null);
}

/**
 * Trouve la ligne d'en-tête (dans les 15 premières lignes) : celle qui contient
 * au moins une colonne « prénom », « nom » ou « surveillant ». Renvoie l'index
 * et le mapping. Repli positionnel si aucune en-tête reconnue.
 */
function locateHeader(rawRows: string[][]): { headerIdx: number; map: (keyof ImportedSurveillant | null)[] } {
  const limit = Math.min(rawRows.length, 15);
  for (let i = 0; i < limit; i++) {
    const map = mapHeader(rawRows[i]);
    if (map.some((m) => m === "prenom" || m === "nom" || m === "fullname")) {
      return { headerIdx: i, map };
    }
  }
  return { headerIdx: 0, map: rawRows[0]?.map((_, i) => POSITIONAL[i] ?? null) ?? [] };
}

export function buildImportPreview(
  rawRows: string[][],
  existing: { nom: string; email?: string | null; telephone?: string | null }[]
): ImportPreview {
  if (rawRows.length === 0) return { rows: [], total: 0, valides: 0, aCorriger: 0, doublons: 0 };

  const { headerIdx, map } = locateHeader(rawRows);
  const body = rawRows.slice(headerIdx + 1);

  const existNoms = new Set(existing.map((e) => norm(e.nom)));
  const existEmails = new Set(existing.map((e) => norm(e.email ?? "")).filter(Boolean));
  const existTels = new Set(existing.map((e) => (e.telephone ?? "").replace(/\D/g, "")).filter(Boolean));

  const seenInFile = new Set<string>(); // dédup interne (planning : noms répétés)

  const rows: PreviewRow[] = body.map((cells) => {
    const data = emptyRow();
    cells.forEach((cell, i) => {
      const key = map[i];
      if (key) data[key] = (cell ?? "").trim();
    });

    // Nom complet : colonne dédiée « SURVEILLANT » (civilité retirée) sinon Prénom + Nom.
    const nomComplet = data.fullname
      ? stripCivility(data.fullname)
      : [data.prenom, data.nom].filter(Boolean).join(" ").trim();

    const statutNormalise = normalizeStatut(data.statut);
    const qualifications = [
      data.observations,
      data.zone ? `Zone : ${data.zone}` : "",
      data.dispoMatin ? `Matin : ${data.dispoMatin}` : "",
      data.dispoApm ? `Après-midi : ${data.dispoApm}` : "",
    ].filter(Boolean).join(" · ");

    const errors: string[] = [];
    const key = norm(nomComplet);
    // Ignore les faux noms de planning (« — », « volant », vides).
    if (!nomComplet || nomComplet === "—") errors.push("Nom manquant");
    if (!isValidEmail(data.email)) errors.push("Email invalide");
    if (!isValidPhone(data.telephone)) errors.push("Téléphone invalide");

    const dupInterne = !!key && seenInFile.has(key);
    if (key) seenInFile.add(key);

    const duplicate =
      dupInterne ||
      (!!nomComplet && existNoms.has(key)) ||
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

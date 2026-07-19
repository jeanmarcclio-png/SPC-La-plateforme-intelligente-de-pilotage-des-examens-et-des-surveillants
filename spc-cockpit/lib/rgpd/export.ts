// Construction du dossier d'export « droit d'accès / portabilité » d'un
// surveillant. Fonctions pures (testables), séparées de l'accès Supabase.

export interface ExportSurveillantRow {
  nom: string;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  role?: string | null;
  zone?: string | null;
  heures?: number | null;
  taux_horaire?: number | null;
  nb_examens?: number | null;
}

export interface ExportDossier {
  exporte_le: string;
  identite: {
    nom: string; prenom: string | null; email: string | null;
    telephone: string | null; role: string | null; zone: string | null;
  };
  heures: { total_heures: number; taux_horaire: number | null; nb_examens: number };
  affectations: Record<string, unknown>[];
  disponibilites: Record<string, unknown>[];
}

/** Assemble le dossier JSON complet (identité + heures + affectations + dispo). */
export function buildExportDossier(
  s: ExportSurveillantRow,
  affectations: Record<string, unknown>[],
  disponibilites: Record<string, unknown>[],
  now: Date = new Date()
): ExportDossier {
  return {
    exporte_le: now.toISOString(),
    identite: {
      nom: s.nom, prenom: s.prenom ?? null, email: s.email ?? null,
      telephone: s.telephone ?? null, role: s.role ?? null, zone: s.zone ?? null,
    },
    heures: { total_heures: s.heures ?? 0, taux_horaire: s.taux_horaire ?? null, nb_examens: s.nb_examens ?? 0 },
    affectations,
    disponibilites,
  };
}

const CSV_COLS = ["id", "mission_id", "session_id", "salle", "statut", "matin", "apm", "presence"] as const;

/** CSV plat des affectations (portabilité). */
export function buildAffectationsCsv(affectations: Record<string, unknown>[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [CSV_COLS.join(",")].concat(
    affectations.map((a) => CSV_COLS.map((c) => esc(a[c])).join(","))
  );
  return lignes.join("\n");
}

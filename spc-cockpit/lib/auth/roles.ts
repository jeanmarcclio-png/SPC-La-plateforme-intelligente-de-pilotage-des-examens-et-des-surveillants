// Contrôle d'accès par rôle SPC (Master Prompt §17).
// Hiérarchie ordonnée : un rôle donne au moins les droits des rôles inférieurs.
// Fonctions pures — le câblage sur les Server Actions / routes viendra ensuite.

export const ROLES = ["lecteur", "planificateur", "coordinateur", "administrateur"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  lecteur: 0,
  planificateur: 1,
  coordinateur: 2,
  administrateur: 3,
};

/** Normalise un libellé de rôle libre (base de données) vers un Role connu. */
export function normalizeRole(raw: string | null | undefined): Role {
  const r = (raw ?? "").trim().toLowerCase();
  if (r.startsWith("admin")) return "administrateur";
  if (r.startsWith("coord")) return "coordinateur";
  if (r.startsWith("planif")) return "planificateur";
  return "lecteur";
}

/** Vrai si `role` atteint au moins le niveau `required`. */
export function hasRole(role: Role, required: Role): boolean {
  return RANK[role] >= RANK[required];
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Garde d'autorisation à appeler en tête d'un outil ou d'une action.
 * Retourne un résultat structuré ({ok:false, error}) — ne lève pas, pour
 * rester cohérent avec le pattern Server Action `{error?}` du projet.
 */
export function assertRole(role: Role, required: Role): AuthResult {
  return hasRole(role, required)
    ? { ok: true }
    : { ok: false, error: `Accès refusé : rôle « ${required} » requis (rôle actuel : « ${role} »).` };
}

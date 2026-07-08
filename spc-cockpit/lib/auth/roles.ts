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

// ---------------------------------------------------------------------------
// Capacités opérationnelles (dérivées du rôle)
// ---------------------------------------------------------------------------

export type Capability = "read" | "plan" | "validate" | "finance" | "admin";

/** Rôle minimal requis pour chaque capacité. */
export const CAPABILITY_MIN_ROLE: Record<Capability, Role> = {
  read: "lecteur",
  plan: "planificateur",
  validate: "coordinateur",
  finance: "coordinateur",
  admin: "administrateur",
};

export const canReadOperations = (role: Role) => hasRole(role, "lecteur");
export const canPlanOperations = (role: Role) => hasRole(role, "planificateur");
export const canValidateOperations = (role: Role) => hasRole(role, "coordinateur");
export const canManageFinance = (role: Role) => hasRole(role, "coordinateur");
export const canAdminOrg = (role: Role) => hasRole(role, "administrateur");

/**
 * Décision d'autorisation PURE (testable sans Supabase). Le câblage serveur
 * (session.ts) fournit `authenticated`, `enforce` et `role`.
 * - non authentifié → toujours refusé ;
 * - mode transition (enforce = false) → autorisé dès lors qu'on est authentifié
 *   (compatibilité ascendante tant que les rôles ne sont pas semés en base) ;
 * - mode strict (enforce = true) → vérifie la capacité selon le rôle.
 */
export function authorize(input: {
  authenticated: boolean;
  enforce: boolean;
  role: Role | null;
  capability: Capability;
}): AuthResult {
  if (!input.authenticated) return { ok: false, error: "Non authentifié." };
  if (!input.enforce) return { ok: true };
  const role = input.role ?? "lecteur";
  return hasRole(role, CAPABILITY_MIN_ROLE[input.capability])
    ? { ok: true }
    : { ok: false, error: `Accès refusé : capacité « ${input.capability} » non autorisée pour le rôle « ${role} ».` };
}

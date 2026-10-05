// Gestion des collaborateurs d'une organisation — logique PURE (testable sans
// Supabase). Le câblage serveur (service_role, Resend) vit dans
// app/actions/collaborateurs.ts.
//
// Périmètre : les comptes « bureau » (lecteur → administrateur). Les comptes
// surveillant (portail /moi) restent gérés depuis l'écran Surveillants.

import { ROLES, normalizeRole, type Role } from "./roles";

export const ROLES_COLLABORATEUR: readonly Role[] = ROLES;

export const ROLE_INFO: Record<Role, { libelle: string; description: string }> = {
  lecteur: {
    libelle: "Lecteur",
    description: "Consulte missions, plannings et rapports, sans rien modifier.",
  },
  planificateur: {
    libelle: "Planificateur",
    description: "Prépare les plannings et les affectations de surveillants.",
  },
  coordinateur: {
    libelle: "Coordinateur",
    description: "Valide les plannings, gère devis, facturation et invitations surveillants.",
  },
  administrateur: {
    libelle: "Administrateur",
    description: "Accès complet, y compris la gestion des collaborateurs.",
  },
};

/** Vrai si le libellé de rôle en base désigne un compte surveillant (portail). */
export function estRoleSurveillant(raw: string | null | undefined): boolean {
  return (raw ?? "").trim().toLowerCase().startsWith("surveill");
}

/** Rôle collaborateur affichable à partir du libellé brut en base. */
export function roleCollaborateur(raw: string | null | undefined): Role {
  return normalizeRole(raw);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ValidationInvitation =
  | { ok: true; email: string; role: Role; nom: string | null }
  | { ok: false; error: string };

/** Valide et normalise une demande d'invitation (email, rôle, nom facultatif). */
export function validerInvitation(input: {
  email: string;
  role: string;
  nom?: string | null;
}): ValidationInvitation {
  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Renseignez l'email du collaborateur." };
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Adresse email invalide." };
  }
  const role = (input.role ?? "").trim().toLowerCase();
  if (!(ROLES_COLLABORATEUR as readonly string[]).includes(role)) {
    return { ok: false, error: "Rôle inconnu." };
  }
  const nom = (input.nom ?? "").trim().slice(0, 120) || null;
  return { ok: true, email, role: role as Role, nom };
}

/**
 * Garde-fou des actions sur un membre existant. Un administrateur ne peut ni
 * modifier son propre rôle ni se retirer : l'organisation garde donc toujours
 * au moins un administrateur (seul un autre administrateur peut le rétrograder).
 * Les comptes surveillant ne se gèrent pas depuis cet écran.
 */
export function controlerActionMembre(input: {
  acteurId: string;
  cibleId: string;
  cibleRoleBrut: string | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  if (input.acteurId === input.cibleId) {
    return {
      ok: false,
      error: "Vous ne pouvez pas modifier ou retirer votre propre accès. Demandez à un autre administrateur.",
    };
  }
  if (estRoleSurveillant(input.cibleRoleBrut)) {
    return { ok: false, error: "Ce compte est un accès surveillant : gérez-le depuis l'écran Surveillants." };
  }
  return { ok: true };
}

export type TypeLienAcces = "invite" | "recovery";

/**
 * Chemin interne sûr pour une redirection post-authentification : accepte
 * uniquement un chemin relatif à l'application (pas de //, pas de schéma).
 */
export function cheminInterneSur(next: string | null | undefined, defaut = "/operations"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return defaut;
  return next;
}

export const CHEMIN_MOT_DE_PASSE = "/compte/mot-de-passe";

/**
 * Lien d'accès envoyé au collaborateur : il ouvre une session via
 * /auth/confirm (vérification du jeton côté serveur), puis amène à l'écran de
 * choix du mot de passe.
 */
export function construireLienAcces(origin: string, tokenHash: string, type: TypeLienAcces): string {
  const base = origin.replace(/\/+$/, "");
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: CHEMIN_MOT_DE_PASSE });
  return `${base}/auth/confirm?${params.toString()}`;
}

/** Contenu texte de l'email d'invitation (pas de HTML : lisible partout). */
export function emailInvitation(input: {
  lien: string;
  role: Role;
  organisation: string;
  invitant?: string | null;
  relance?: boolean;
}): { sujet: string; texte: string } {
  const { libelle } = ROLE_INFO[input.role];
  const par = input.invitant ? ` par ${input.invitant}` : "";
  const sujet = input.relance ? "Votre lien d'accès à Survéo" : "Votre accès à Survéo";
  const intro = input.relance
    ? `Voici un nouveau lien pour accéder à Survéo (${input.organisation}).`
    : `Vous avez été invité${par} à rejoindre ${input.organisation} sur Survéo, la plateforme de pilotage des examens et des surveillants.`;
  const texte = `Bonjour,

${intro}

Votre rôle : ${libelle}.

Pour activer votre accès et choisir votre mot de passe, ouvrez ce lien :
${input.lien}

Ce lien est personnel et à usage unique. S'il a expiré, demandez-en un nouveau à votre administrateur.

Ensuite, vous vous connecterez avec votre email et votre mot de passe.

L'équipe Survéo`;
  return { sujet, texte };
}

// Minimisation RGPD (audit eve §5) : projection des données opérationnelles
// vers ce qui est réellement nécessaire à l'analyse de risque, SANS données
// personnelles. Aucun nom, téléphone ou e-mail ne doit atteindre le modèle.
// Fonctions pures.

export interface RawSupervisor {
  id: number;
  nom?: string;
  email?: string;
  telephone?: string;
  role?: string;
  statut?: string;
  heures?: number;
}

/** Vue anonymisée d'un surveillant : identifiant + attributs opérationnels. */
export interface RedactedSupervisor {
  ref: string; // "S-12" — jamais le nom
  role: string;
  statut: string;
  heures: number;
}

export function redactSupervisor(s: RawSupervisor): RedactedSupervisor {
  return {
    ref: `S-${s.id}`,
    role: s.role ?? "Surveillant",
    statut: s.statut ?? "—",
    heures: s.heures ?? 0,
  };
}

export function redactSupervisors(list: RawSupervisor[]): RedactedSupervisor[] {
  return list.map(redactSupervisor);
}

/** Détecte grossièrement une PII résiduelle dans une chaîne (garde-fou). */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Téléphone : au moins 10 chiffres (numéro FR) éventuellement séparés par
// espaces/points/tirets. Le seuil de 10 évite les faux positifs sur les dates
// ISO (« 2026-07-08 » = 8 chiffres) qui ne sont PAS des données personnelles.
const PHONE_RE = /(?:\+?\d[\s.-]?){10,}/;

export function containsPII(text: string): boolean {
  return EMAIL_RE.test(text) || PHONE_RE.test(text);
}

/**
 * Filet de sécurité : refuse un payload qui contiendrait encore une PII.
 * À appeler avant d'envoyer quoi que ce soit au modèle.
 */
export function assertNoPII(payload: unknown): { ok: boolean; error?: string } {
  const text = JSON.stringify(payload ?? "");
  return containsPII(text)
    ? { ok: false, error: "Donnée personnelle détectée dans le payload destiné au modèle — envoi bloqué." }
    : { ok: true };
}

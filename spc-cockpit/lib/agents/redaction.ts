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

/** Identifiant pseudonyme STABLE : même entité → même ref (pas de hasard). */
export function createStablePseudonymousId(entityType: string, entityId: number | string): string {
  const prefix = entityType.trim().charAt(0).toUpperCase() || "X";
  return `${prefix}-${entityId}`;
}

/** j.dupont@ecole.fr → j***@e***.fr (domaine et locale masqués). */
export function maskEmail(email: string): string {
  const m = /^([^@]+)@([^@]+)$/.exec(email.trim());
  if (!m) return "***";
  const [, local, domain] = m;
  const head = (s: string) => (s.length <= 1 ? s : s[0] + "***");
  const dotIdx = domain.lastIndexOf(".");
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : "";
  const dom = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain;
  return `${head(local)}@${head(dom)}${tld}`;
}

/** 06 12 34 56 78 → ******** 78 (ne conserve que les 2 derniers chiffres). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 2) return "***";
  return "•".repeat(Math.max(0, digits.length - 2)) + digits.slice(-2);
}

/** Neutralise toute PII (email / téléphone) dans un texte libre. */
export function removeFreeTextPII(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(EMAIL_RE_G, "[email]")
    .replace(PHONE_RE_G, "[téléphone]");
}

export function redactSupervisor(s: RawSupervisor): RedactedSupervisor {
  return {
    ref: createStablePseudonymousId("Surveillant", s.id),
    role: s.role ?? "Surveillant",
    statut: s.statut ?? "—",
    heures: s.heures ?? 0,
  };
}

export function redactSupervisors(list: RawSupervisor[]): RedactedSupervisor[] {
  return list.map(redactSupervisor);
}

export interface RawAssignment {
  id: number | string;
  surveillantId: number | string;
  salle?: string | null;
  matin?: boolean;
  matinDebut?: string | null;
  matinFin?: string | null;
  apm?: boolean;
  apmDebut?: string | null;
  apmFin?: string | null;
  observations?: string | null;
}

export interface RedactedAssignment {
  ref: string;
  supervisorRef: string;
  salle: string | null;
  matin: { on: boolean; debut: string | null; fin: string | null };
  apm: { on: boolean; debut: string | null; fin: string | null };
  observations: string;
}

/** Projette une affectation sans PII (identifiants + créneaux + notes nettoyées). */
export function redactAssignment(a: RawAssignment): RedactedAssignment {
  return {
    ref: createStablePseudonymousId("Affectation", a.id),
    supervisorRef: createStablePseudonymousId("Surveillant", a.surveillantId),
    salle: a.salle ?? null,
    matin: { on: !!a.matin, debut: a.matinDebut ?? null, fin: a.matinFin ?? null },
    apm: { on: !!a.apm, debut: a.apmDebut ?? null, fin: a.apmFin ?? null },
    observations: removeFreeTextPII(a.observations),
  };
}

/**
 * Construit un payload d'analyse de risque garanti sans PII : surveillants et
 * affectations projetés, agrégats/anomalies conservés. Lève si une PII subsiste.
 */
export function buildPlanningRiskSafePayload(data: {
  supervisors?: RawSupervisor[];
  assignments?: RawAssignment[];
  aggregates?: Record<string, unknown>;
}): { equipe: RedactedSupervisor[]; affectations: RedactedAssignment[]; aggregates: Record<string, unknown> } {
  const payload = {
    equipe: (data.supervisors ?? []).map(redactSupervisor),
    affectations: (data.assignments ?? []).map(redactAssignment),
    aggregates: data.aggregates ?? {},
  };
  const guard = assertNoPII(payload);
  if (!guard.ok) throw new Error(guard.error);
  return payload;
}

/** Détecte grossièrement une PII résiduelle dans une chaîne (garde-fou). */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Téléphone : au moins 10 chiffres (numéro FR) éventuellement séparés par
// espaces/points/tirets. Le seuil de 10 évite les faux positifs sur les dates
// ISO (« 2026-07-08 » = 8 chiffres) qui ne sont PAS des données personnelles.
const PHONE_RE = /(?:\+?\d[\s.-]?){10,}/;
// Variantes globales pour le remplacement dans les textes libres.
const EMAIL_RE_G = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE_G = /(?:\+?\d[\s.-]?){10,}/g;

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

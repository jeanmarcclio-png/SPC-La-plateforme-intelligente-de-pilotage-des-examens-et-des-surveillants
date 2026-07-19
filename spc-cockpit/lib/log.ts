// Logger centralisé — masque les données personnelles (email, téléphone) avant
// toute écriture en logs (console serveur, Vercel logs). RGPD : aucun email ni
// numéro en clair ne doit apparaître dans les journaux applicatifs.

const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
// Numéros FR/international : 8+ chiffres éventuellement espacés/tirets/points.
const PHONE_RE = /(?<!\d)(\+?\d[\d .\-]{7,}\d)(?!\d)/g;

/** Masque un email : jean.dupont@x.fr → j***@x.fr */
export function maskEmail(v: string | null | undefined): string {
  if (!v) return "";
  return v.replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

/** Masque un téléphone : 0612345678 → 06******78 */
export function maskPhone(v: string | null | undefined): string {
  if (!v) return "";
  return v.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 4) return "****";
    return digits.slice(0, 2) + "*".repeat(digits.length - 4) + digits.slice(-2);
  });
}

/** Nettoie une valeur quelconque (string/objet) de ses email/téléphone. */
export function scrub(value: unknown): unknown {
  if (typeof value === "string") return maskPhone(maskEmail(value));
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // masque aussi par NOM de champ sensible
      if (/email|mail/i.test(k) && typeof v === "string") out[k] = maskEmail(v);
      else if (/tel|phone|telephone|mobile/i.test(k) && typeof v === "string") out[k] = maskPhone(v);
      else out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

function emit(level: "info" | "warn" | "error", args: unknown[]) {
  const safe = args.map(scrub);
  // eslint-disable-next-line no-console
  console[level](...(safe as [unknown, ...unknown[]]));
}

/** Logger sûr : identique à console mais masque email/téléphone. */
export const log = {
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
};

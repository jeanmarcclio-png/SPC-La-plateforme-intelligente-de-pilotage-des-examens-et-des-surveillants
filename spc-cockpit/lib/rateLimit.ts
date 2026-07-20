const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS  = 60_000; // 1 minute
const MAX_CALLS  = 30;     // max Server Action calls per user per window

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  return checkRateLimitBy(userId, MAX_CALLS, WINDOW_MS);
}

/**
 * Limiteur générique par clé arbitraire (userId, IP, `route:ip`…). Utilisé pour
 * protéger les endpoints coûteux (appels IA) et les points d'entrée publics.
 * Best-effort en mémoire d'instance : suffisant contre l'abus applicatif ; la
 * protection anti-force-brute de l'authentification est assurée par Supabase Auth
 * (voir CONFORMITE.md §5).
 */
export function checkRateLimitBy(
  key: string,
  maxCalls: number = MAX_CALLS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxCalls) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Extrait une IP client best-effort des en-têtes de proxy (Vercel/edge). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

// Prevent unbounded memory growth: evict stale buckets periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(key);
    }
  }, WINDOW_MS * 5);
}

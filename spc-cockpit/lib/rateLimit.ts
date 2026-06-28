const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS  = 60_000; // 1 minute
const MAX_CALLS  = 30;     // max Server Action calls per user per window

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_CALLS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
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

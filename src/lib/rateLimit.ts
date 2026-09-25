/**
 * Fixed-window in-memory rate limiter. The app runs as a single container, so
 * process memory is an adequate store; move to Redis if it is ever scaled out.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Drop expired windows occasionally so the map cannot grow without bound.
  if (now - lastSweep > 60_000) {
    for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Whether `key` has already used up `limit` in its current window, without counting a hit. */
export function isLimited(key: string, limit: number): RateLimitResult {
  const current = buckets.get(key);
  const now = Date.now();
  if (!current || current.resetAt <= now || current.count < limit) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
}

/**
 * Best-effort client IP. Behind nginx the real address is in X-Real-IP or is the
 * last X-Forwarded-For hop (earlier hops are client-controlled and spoofable).
 */
export function clientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map(h => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
}

export const LIMITS = {
  general: { limit: 60, windowMs: 60_000 },
  llm: { limit: 10, windowMs: 60_000 },
  // Firebase rate-limits the sign-in itself; this only throttles repeated bad tokens per IP.
  authFailure: { limit: 30, windowMs: 15 * 60_000 },
} as const;

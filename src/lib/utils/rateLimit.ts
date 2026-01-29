type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const isProduction = process.env.NODE_ENV === "production";

const RATE_LIMIT_WINDOW_MS = isProduction ? 24 * 60 * 60 * 1000 : 60 * 1000; // 24h prod, 1m dev
const RATE_LIMIT_MAX = isProduction ? 2 : 100; // 2 prod, 100 dev

const store = new Map<string, RateLimitEntry>();

export const checkRateLimit = (key: string): { allowed: boolean; retryAfter: number } => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: entry.resetAt - now };
  }

  entry.count += 1;
  store.set(key, entry);
  return { allowed: true, retryAfter: entry.resetAt - now };
};

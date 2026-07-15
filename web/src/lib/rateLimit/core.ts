export type RateLimitScope = "neis" | "analyze" | "ai";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; message: string };

type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RATE_LIMITS: Record<RateLimitScope, { max: number; windowMs: number }[]> = {
  neis: [
    { max: intEnv("RATE_LIMIT_NEIS_PER_MIN", 8), windowMs: 60_000 },
    { max: intEnv("RATE_LIMIT_NEIS_PER_HOUR", 60), windowMs: 3_600_000 },
  ],
  analyze: [
    { max: intEnv("RATE_LIMIT_ANALYZE_PER_MIN", 6), windowMs: 60_000 },
    { max: intEnv("RATE_LIMIT_ANALYZE_PER_HOUR", 35), windowMs: 3_600_000 },
  ],
  ai: [
    { max: intEnv("RATE_LIMIT_AI_PER_MIN", 4), windowMs: 60_000 },
    { max: intEnv("RATE_LIMIT_AI_PER_HOUR", 20), windowMs: 3_600_000 },
  ],
};

function pruneExpired(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, entry] of windows) {
    if (now >= entry.resetAt) windows.delete(key);
  }
}

export function consumeRateLimit(
  scope: RateLimitScope,
  clientId: string,
  limits: { max: number; windowMs: number }[] = RATE_LIMITS[scope],
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  for (const { max, windowMs } of limits) {
    const key = `${scope}:${clientId}:${windowMs}`;
    const entry = windows.get(key);
    if (!entry || now >= entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      continue;
    }
    if (entry.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return {
        allowed: false,
        retryAfterSec,
        message: formatRateLimitMessage(retryAfterSec),
      };
    }
    entry.count += 1;
  }

  return { allowed: true };
}

export function formatRateLimitMessage(retryAfterSec: number): string {
  if (retryAfterSec <= 90) {
    return `API 요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도해 주세요.`;
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `API 요청이 너무 많습니다. 약 ${minutes}분 후 다시 시도해 주세요.`;
}

/** 테스트용 초기화 */
export function resetRateLimitsForTests(): void {
  windows.clear();
}

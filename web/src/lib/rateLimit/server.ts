import "server-only";

import { headers } from "next/headers";
import {
  consumeRateLimit,
  type RateLimitResult,
  type RateLimitScope,
} from "@/lib/rateLimit/core";

export type { RateLimitResult, RateLimitScope } from "@/lib/rateLimit/core";
export { formatRateLimitMessage } from "@/lib/rateLimit/core";

export async function getRequestClientId(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = h.get("x-real-ip")?.trim();
  return forwarded || realIp || "local";
}

export async function enforceRateLimits(
  ...scopes: RateLimitScope[]
): Promise<RateLimitResult> {
  const clientId = await getRequestClientId();
  for (const scope of scopes) {
    const result = consumeRateLimit(scope, clientId);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

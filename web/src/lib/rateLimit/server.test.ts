import { describe, it, expect, beforeEach } from "vitest";
import {
  consumeRateLimit,
  formatRateLimitMessage,
  resetRateLimitsForTests,
} from "./core";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it("한도 내에서는 허용한다", () => {
    const limits = [{ max: 2, windowMs: 60_000 }];
    expect(consumeRateLimit("neis", "user-a", limits).allowed).toBe(true);
    expect(consumeRateLimit("neis", "user-a", limits).allowed).toBe(true);
  });

  it("한도를 넘기면 차단한다", () => {
    const limits = [{ max: 2, windowMs: 60_000 }];
    consumeRateLimit("analyze", "user-b", limits);
    consumeRateLimit("analyze", "user-b", limits);
    const blocked = consumeRateLimit("analyze", "user-b", limits);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(formatRateLimitMessage(blocked.retryAfterSec)).toMatch(/API 요청/);
    }
  });

  it("클라이언트별로 따로 센다", () => {
    const limits = [{ max: 1, windowMs: 60_000 }];
    expect(consumeRateLimit("ai", "u1", limits).allowed).toBe(true);
    expect(consumeRateLimit("ai", "u2", limits).allowed).toBe(true);
    expect(consumeRateLimit("ai", "u1", limits).allowed).toBe(false);
  });
});

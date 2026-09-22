import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";

let consumeRateLimit: (args: {
  key: string;
  limit: number;
  windowMs: number;
  now?: Date;
}) => Promise<{ allowed: boolean; retryAfterMs: number }>;

function uniqueKey(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

describe("DB-backed rate limiter (src/lib/rate-limit.ts)", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({ consumeRateLimit } = await import("@/lib/rate-limit"));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("rejects empty keys instead of sharing one bucket", async () => {
    await expect(
      consumeRateLimit({ key: "", limit: 3, windowMs: 60_000 }),
    ).rejects.toThrow(/key/);
    await expect(
      consumeRateLimit({ key: "   ", limit: 3, windowMs: 60_000 }),
    ).rejects.toThrow(/key/);
  });

  it("allows up to the limit, then denies", async () => {
    const key = uniqueKey("allow");
    for (let i = 0; i < 3; i++) {
      const result = await consumeRateLimit({
        key,
        limit: 3,
        windowMs: 60_000,
      });
      expect(result.allowed).toBe(true);
    }
    const denied = await consumeRateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(denied.allowed).toBe(false);
  });

  it("reports a positive retryAfterMs within the window when denied", async () => {
    const key = uniqueKey("retry");
    for (let i = 0; i < 2; i++) {
      await consumeRateLimit({ key, limit: 2, windowMs: 60_000 });
    }
    const denied = await consumeRateLimit({ key, limit: 2, windowMs: 60_000 });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("allows again after the window passes", async () => {
    const key = uniqueKey("window");
    const start = new Date("2026-09-22T05:00:00.000Z");
    await consumeRateLimit({ key, limit: 1, windowMs: 60_000, now: start });
    const denied = await consumeRateLimit({
      key,
      limit: 1,
      windowMs: 60_000,
      now: start,
    });
    expect(denied.allowed).toBe(false);
    const later = new Date(start.getTime() + 61_000);
    const allowed = await consumeRateLimit({
      key,
      limit: 1,
      windowMs: 60_000,
      now: later,
    });
    expect(allowed.allowed).toBe(true);
  });

  it("isolates budgets by key", async () => {
    const keyA = uniqueKey("iso-a");
    const keyB = uniqueKey("iso-b");
    await consumeRateLimit({ key: keyA, limit: 1, windowMs: 60_000 });
    const other = await consumeRateLimit({
      key: keyB,
      limit: 1,
      windowMs: 60_000,
    });
    expect(other.allowed).toBe(true);
  });

  it("prunes expired rows so the table does not grow forever", async () => {
    const key = uniqueKey("prune");
    const start = new Date("2026-09-22T06:00:00.000Z");
    await consumeRateLimit({ key, limit: 5, windowMs: 60_000, now: start });
    const later = new Date(start.getTime() + 61_000);
    await consumeRateLimit({ key, limit: 5, windowMs: 60_000, now: later });
    const { prisma } = await import("@/lib/db");
    const stale = await prisma.rateLimitHit.count({
      where: { key, createdAt: { lt: later } },
    });
    expect(stale).toBe(0);
    await prisma.$disconnect();
  });
});

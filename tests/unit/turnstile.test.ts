import { afterEach, describe, expect, it, vi } from "vitest";

describe("turnstile check (src/lib/turnstile.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("passes in non-production when no secret is configured (dev stub)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const { verifyTurnstile } = await import("@/lib/turnstile");
    await expect(verifyTurnstile("any-token")).resolves.toBe(true);
  });

  it("fails closed in production when no secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const { verifyTurnstile } = await import("@/lib/turnstile");
    await expect(verifyTurnstile("any-token")).resolves.toBe(false);
  });
});

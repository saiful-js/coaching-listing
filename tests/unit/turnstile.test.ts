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

  it("refuses to boot in production when no secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    // Production boot requires TURNSTILE_SECRET_KEY (src/lib/env.ts), so the
    // stub's fail-closed branch is unreachable — nothing can deploy open.
    await expect(import("@/lib/turnstile")).rejects.toThrow(
      /TURNSTILE_SECRET_KEY/,
    );
  });
});

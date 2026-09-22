import { afterEach, describe, expect, it, vi } from "vitest";

const VALID = {
  DATABASE_URL: "postgresql://user:password@localhost:5433/coaching_ngj",
  APP_URL: "http://localhost:3000",
};

function stubEnv(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv("NODE_ENV", "test");
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) {
    vi.stubEnv(key, value ?? "");
  }
}

// src/lib/env.ts validates once at import time, so each case re-imports the
// module with a fresh module registry after stubbing process.env.
describe("env validation (src/lib/env.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a valid environment", async () => {
    stubEnv();
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("rejects a non-PostgreSQL DATABASE_URL with a readable error", async () => {
    stubEnv({ DATABASE_URL: "mysql://user:password@localhost/db" });
    await expect(import("@/lib/env")).rejects.toThrow(
      /PostgreSQL connection string/,
    );
  });

  it("rejects a missing DATABASE_URL", async () => {
    stubEnv({ DATABASE_URL: "" });
    await expect(import("@/lib/env")).rejects.toThrow(
      /Invalid environment configuration/,
    );
  });

  it("accepts a missing M2 auth/provisioning env (dev stubs)", async () => {
    stubEnv();
    const { env } = await import("@/lib/env");
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.TURNSTILE_SECRET_KEY).toBeUndefined();
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it("accepts a fully provisioned M2 environment", async () => {
    stubEnv({
      BETTER_AUTH_SECRET: "test-secret-with-enough-length",
      RESEND_API_KEY: "re_test_key",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
    });
    const { env } = await import("@/lib/env");
    expect(env.BETTER_AUTH_SECRET).toBe("test-secret-with-enough-length");
    expect(env.GOOGLE_CLIENT_ID).toBe("google-client-id");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

describe("stub email outbox (src/lib/email.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("records outgoing mail in the outbox when no provider key is set", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const { sendEmail, emailOutbox, clearEmailOutbox } = await import(
      "@/lib/email"
    );
    clearEmailOutbox();
    await sendEmail({
      to: "owner@example.com",
      subject: "Verify your email",
      text: "Verify your email: http://localhost:3000/verify?token=abc",
    });
    expect(emailOutbox).toHaveLength(1);
    expect(emailOutbox[0]?.to).toBe("owner@example.com");
  });

  it("clearEmailOutbox empties the outbox", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const { sendEmail, emailOutbox, clearEmailOutbox } = await import(
      "@/lib/email"
    );
    clearEmailOutbox();
    await sendEmail({ to: "a@example.com", subject: "s", text: "t" });
    clearEmailOutbox();
    expect(emailOutbox).toHaveLength(0);
  });
});

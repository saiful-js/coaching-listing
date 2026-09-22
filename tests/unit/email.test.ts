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

  it("delivers via Resend without retaining the message when a key is set", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const calls: { url: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push({ url });
        return new Response(JSON.stringify({ id: "msg-1" }), { status: 200 });
      }),
    );
    const { sendEmail, emailOutbox, clearEmailOutbox } = await import(
      "@/lib/email"
    );
    clearEmailOutbox();
    await sendEmail({ to: "owner@example.com", subject: "s", text: "t" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("api.resend.com");
    expect(emailOutbox).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});

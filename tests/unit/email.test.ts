import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
  createTransportMock: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

function stubBase() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5433/x");
  vi.stubEnv("APP_URL", "http://localhost:3000");
}

describe("stub email outbox (src/lib/email.ts)", () => {
  beforeEach(() => {
    sendMailMock.mockReset().mockResolvedValue({ messageId: "test-1" });
    createTransportMock.mockReset().mockReturnValue({ sendMail: sendMailMock });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("records outgoing mail in the outbox when SMTP is not configured", async () => {
    stubBase();
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
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("clearEmailOutbox empties the outbox", async () => {
    stubBase();
    const { sendEmail, emailOutbox, clearEmailOutbox } = await import(
      "@/lib/email"
    );
    clearEmailOutbox();
    await sendEmail({ to: "a@example.com", subject: "s", text: "t" });
    clearEmailOutbox();
    expect(emailOutbox).toHaveLength(0);
  });

  it("delivers via SMTP without retaining the message when configured", async () => {
    stubBase();
    vi.stubEnv("SMTP_USER", "app@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    const { sendEmail, emailOutbox, clearEmailOutbox } = await import(
      "@/lib/email"
    );
    clearEmailOutbox();
    await sendEmail({ to: "owner@example.com", subject: "s", text: "t" });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        subject: "s",
        text: "t",
      }),
    );
    expect(emailOutbox).toHaveLength(0);
  });

  it("throws a generic error (no recipient) when delivery fails", async () => {
    stubBase();
    vi.stubEnv("SMTP_USER", "app@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    sendMailMock.mockRejectedValueOnce(new Error("smtplib boom"));
    const { sendEmail } = await import("@/lib/email");
    await expect(
      sendEmail({ to: "owner@example.com", subject: "s", text: "t" }),
    ).rejects.toThrow(/could not send email/i);
  });
});

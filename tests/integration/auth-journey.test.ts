/**
 * M2 auth journey (integration, needs local DB on :5434).
 *
 * Proves PRD FR-1 + M2 DoD through the REAL Better Auth route handlers
 * (`src/app/api/auth/[...all]/route.ts`) and the real database:
 * register → verify → login → logout, wrong-password ×6 → 429, reset
 * tokens single-use + expiring.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ORIGIN = "http://localhost:3000";

import type { PrismaClient } from "@/generated/prisma/client";
import type { OutgoingEmail } from "@/lib/email";

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;
let prisma: PrismaClient;
let clearEmailOutbox: () => void;
let emailOutbox: OutgoingEmail[];

const runId = Date.now().toString(36);
const email = `journey-${runId}@example.com`;
const resendEmail = `resend-${runId}@example.com`;
const password = "s3cure-pass";
const newPassword = "n3w-secure-pass";

function cookieHeader(setCookies: string[]): string {
  return setCookies.map((header) => header.split(";")[0]).join("; ");
}

function lastMailUrl(): string {
  const text = emailOutbox[emailOutbox.length - 1]?.text as string;
  const match = text.match(/https?:\/\/\S+/);
  if (!match) {
    throw new Error(`no URL in outbox mail: ${text}`);
  }
  return match[0];
}

describe("M2 auth journey", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://coaching:coaching@localhost:5434/coaching_ngj",
    );
    vi.stubEnv("APP_URL", ORIGIN);
    vi.stubEnv(
      "BETTER_AUTH_SECRET",
      "test-secret-for-journey-0123456789abcdef",
    );
    ({ GET, POST } = await import("@/app/api/auth/[...all]/route"));
    ({ prisma } = await import("@/lib/db"));
    ({ emailOutbox, clearEmailOutbox } = await import("@/lib/email"));
    clearEmailOutbox();
    await prisma.rateLimit.deleteMany({});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [email, resendEmail] } },
    });
    await prisma.verification.deleteMany({
      where: { identifier: { contains: runId } },
    });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("registers and sends a verification email", async () => {
    const res = await POST(
      new Request(`${ORIGIN}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Journey Owner",
          email,
          password,
          callbackURL: "/verify-email?verified=1",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(emailOutbox).toHaveLength(1);
    expect(lastMailUrl()).toContain("/api/auth/verify-email");
  });

  it("verifies the email via the outbox link", async () => {
    const res = await GET(new Request(lastMailUrl()));
    // Better Auth redirects to the callback URL after verifying.
    expect([200, 302, 307]).toContain(res.status);
    // The register form's callbackURL carries ?verified=1 so the landing
    // page can show the success state instead of "check your inbox".
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("verified=1");
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.emailVerified).toBe(true);
  });

  it("logs in and reads the session, then logs out", async () => {
    const login = await POST(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(login.status).toBe(200);
    const cookie = cookieHeader(login.headers.getSetCookie());
    expect(cookie).toContain("better-auth.session_token");

    const session = await GET(
      new Request(`${ORIGIN}/api/auth/get-session`, {
        headers: { cookie },
      }),
    );
    expect(session.status).toBe(200);
    const body = (await session.json()) as {
      user?: { email?: string };
    };
    expect(body.user?.email).toBe(email);

    const logout = await POST(
      new Request(`${ORIGIN}/api/auth/sign-out`, {
        method: "POST",
        headers: { cookie },
      }),
    );
    expect(logout.status).toBe(200);

    const after = await GET(
      new Request(`${ORIGIN}/api/auth/get-session`, {
        headers: { cookie },
      }),
    );
    const afterBody = (await after.json()) as { user?: unknown } | null;
    expect(afterBody?.user ?? null).toBeNull();
  });

  it("rate-limits after 6 wrong passwords in a short window", async () => {
    await prisma.rateLimit.deleteMany({});
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await POST(
        new Request(`${ORIGIN}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "wrong-password" }),
        }),
      );
      lastStatus = res.status;
      await res.text();
    }
    // 5 attempts allowed (401), the 6th is rate-limited (429).
    expect(lastStatus).toBe(429);
  });

  it("resets the password with a single-use, expiring token", async () => {
    await prisma.rateLimit.deleteMany({});
    const requested = await POST(
      new Request(`${ORIGIN}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      }),
    );
    expect(requested.status).toBe(200);
    const resetUrl = lastMailUrl();
    const token = resetUrl.match(/reset-password\/([^/?\s]+)/)?.[1];
    expect(token).toBeTruthy();

    const reset = await POST(
      new Request(`${ORIGIN}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, token }),
      }),
    );
    expect(reset.status).toBe(200);

    // Single-use: the same token is rejected now.
    const replay = await POST(
      new Request(`${ORIGIN}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "another-pass-1", token }),
      }),
    );
    expect(replay.status).not.toBe(200);

    // New password works.
    await prisma.rateLimit.deleteMany({});
    const login = await POST(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword }),
      }),
    );
    expect(login.status).toBe(200);

    // Expiring: backdate a fresh token's Verification row, then it fails.
    await POST(
      new Request(`${ORIGIN}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      }),
    );
    const token2 = lastMailUrl().match(/reset-password\/([^/?\s]+)/)?.[1];
    expect(token2).toBeTruthy();
    await prisma.verification.updateMany({
      where: { identifier: `reset-password:${token2}` },
      data: { expiresAt: new Date("2000-01-01T00:00:00.000Z") },
    });
    const expired = await POST(
      new Request(`${ORIGIN}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "another-pass-2", token: token2 }),
      }),
    );
    expect(expired.status).not.toBe(200);
  });

  it("resends a verification link for an unverified account", async () => {
    await prisma.rateLimit.deleteMany({});
    const signup = await POST(
      new Request(`${ORIGIN}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Resend Owner",
          email: resendEmail,
          password,
          callbackURL: "/verify-email?verified=1",
        }),
      }),
    );
    expect(signup.status).toBe(200);
    clearEmailOutbox();

    const resend = await POST(
      new Request(`${ORIGIN}/api/auth/send-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resendEmail,
          callbackURL: "/verify-email?verified=1",
        }),
      }),
    );
    expect(resend.status).toBe(200);
    expect(emailOutbox).toHaveLength(1);
    expect(lastMailUrl()).toContain("/api/auth/verify-email");
  });

  it("does not reveal whether an address exists (anti-enumeration)", async () => {
    clearEmailOutbox();
    const unknown = await POST(
      new Request(`${ORIGIN}/api/auth/send-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `nobody-${runId}@example.com` }),
      }),
    );
    expect(unknown.status).toBe(200);
    expect(emailOutbox).toHaveLength(0);
  });
});

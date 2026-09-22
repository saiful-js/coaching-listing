import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

/**
 * Better Auth configuration (M2, PRD FR-1).
 *
 * - Email/password with verification mail + password reset, both delivered
 *   through `src/lib/email.ts` (dev outbox until Resend is provisioned).
 * - `requireEmailVerification: false`: per PRD FR-1, unverified users can
 *   log in but cannot submit a listing for review — that gate is enforced
 *   in M3's listing service, not here.
 * - Google OAuth is enabled only when both `GOOGLE_CLIENT_ID` and
 *   `GOOGLE_CLIENT_SECRET` are set (M2 provisioning gate).
 * - `role` stays app-owned (PRD §7): never accepted from client input.
 *
 * After changing this file, re-run `npx @better-auth/cli generate` and
 * diff: the schema must keep following the CLI, not memory (PRD §7 rule).
 */
const googleConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Public origin: emailed verify/reset links + OAuth redirect_uris derive
  // from here instead of per-request inference (validated, https in prod).
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Persisted (database) because serverless instances do not share memory.
  // PRD FR-1 AC: 6+ wrong passwords in a short window → rate-limited.
  // `enabled` is explicit because the default follows NODE_ENV (off outside
  // production) — protection must be provable in tests, not just in prod.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 600, max: 5 },
      "/sign-up/email": { window: 600, max: 10 },
      "/request-password-reset": { window: 600, max: 5 },
    },
  },
  // Turnstile only when provisioned; without a secret the plugin stays out
  // and the dev-stub behavior in src/lib/turnstile.ts applies (open outside
  // production, closed in production).
  //
  // Provisioning checklist (do all three together — a secret without the
  // client token breaks every form, see C-2 review 2026-09-22):
  // 1. Set TURNSTILE_SECRET_KEY (+ required in production by src/lib/env.ts).
  // 2. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY + a Turnstile widget on the
  //    register/login/forgot pages.
  // 3. Pass the widget token as the forms' `captchaToken` prop (sent as the
  //    docs-prescribed `x-captcha-response` header via captchaHeaders()).
  // 4. Re-run the auth journey with the secret set to prove it still passes.
  plugins: [
    ...(env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: env.TURNSTILE_SECRET_KEY,
          }),
        ]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Coaching NGJ password",
        text: `Reset your password here (single-use, expires in 1 hour): ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Coaching NGJ email",
        text: `Verify your email address: ${url}`,
      });
    },
  },
  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        },
      }
    : {}),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "OWNER",
        input: false, // never accepted from client input
      },
    },
  },
});

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
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
  secret: env.BETTER_AUTH_SECRET,
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

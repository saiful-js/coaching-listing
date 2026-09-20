import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { prisma } from "@/lib/db";

/**
 * Better Auth configuration.
 *
 * Minimal in M1: exists so the Better Auth CLI can generate its tables
 * (`npx @better-auth/cli generate`) against the right database shape.
 * Email verification, reset flows, Google OAuth, Turnstile, and rate limits
 * are added in M2 — the CLI must be re-run then so the schema follows.
 *
 * `role` is app-owned (PRD §7): users cannot set it; the seed grants ADMIN.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
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

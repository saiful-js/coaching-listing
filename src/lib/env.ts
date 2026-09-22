import { z } from "zod";

/**
 * Server environment, validated once at boot (PRD §10: "Validate env at boot").
 *
 * Fail-loud: a missing or malformed variable stops the process at startup with
 * a readable message instead of surfacing later as a runtime error inside a
 * request. CI and local builds provide values from `.env.example`.
 *
 * Server-only by convention — never import this from a Client Component.
 * Public (`NEXT_PUBLIC_*`) values get their own validated module when the
 * first one is actually needed (likely R2's image base URL in M4).
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /** Absolute origin of the app; used for metadata / canonical URLs (M7). */
    APP_URL: z.url().default("http://localhost:3000"),
    /** PostgreSQL connection string (consumed by Prisma from M1). */
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          value.startsWith("postgresql://") || value.startsWith("postgres://"),
        { message: "must be a PostgreSQL connection string (postgresql://…)" },
      ),
    // ── M2 auth / provisioning (all optional) ─────────────────────────────
    // Dev stubs stand in until accounts are provisioned; each gated feature
    // fails loud at use-time (not boot-time) when its key is missing.
    /** Better Auth secret (optional in dev/test; required in production). */
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
    // ── SMTP mail (Gmail; ADR 0003) ─────────────────────────────────────
    // The dev/test outbox stub applies while SMTP_USER/SMTP_PASS are unset.
    /** SMTP host (Gmail default). */
    SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
    /** SMTP port (587 STARTTLS default; 465 for implicit TLS). */
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    /** Gmail address used as the SMTP username. */
    SMTP_USER: z.email().optional(),
    /** Google App Password (not the account password). */
    SMTP_PASS: z.string().min(1).optional(),
    /** From header; defaults to the SMTP user. */
    SMTP_FROM: z.string().min(1).optional(),
    /** Cloudflare Turnstile secret (M2 gate; required in production). */
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    /** Google OAuth client id/secret (M2 gate; provider enabled only if both set). */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    // Production cannot boot on stub posture: without these, the app would
    // serve auth with weak secrets, localhost links, or no bot/mail checks.
    if (val.NODE_ENV !== "production") {
      return;
    }
    if (!val.BETTER_AUTH_SECRET || val.BETTER_AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "required in production (min 32 characters)",
      });
    }
    try {
      const url = new URL(val.APP_URL);
      const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
      if (url.protocol !== "https:" || loopback) {
        throw new Error("loopback");
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "must be a public https URL in production",
      });
    }
    if (!val.SMTP_USER || !val.SMTP_PASS) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_USER"],
        message:
          "SMTP_USER and SMTP_PASS are required in production (verification/reset mail)",
      });
    }
    if (!val.TURNSTILE_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["TURNSTILE_SECRET_KEY"],
        message: "required in production (register/reset bot checks)",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const key = issue.path.join(".");
        return `  - ${key || "(unknown)"}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(
      `Invalid environment configuration — fix the following and restart:\n${details}\nSee .env.example for the expected variables.`,
    );
  }
  return Object.freeze(result.data);
}

export const env = loadServerEnv();

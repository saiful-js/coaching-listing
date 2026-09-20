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
const serverEnvSchema = z.object({
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

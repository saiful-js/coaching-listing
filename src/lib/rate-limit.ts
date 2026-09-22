import { prisma } from "@/lib/db";

export interface ConsumeRateLimitArgs {
  /** Bucket, e.g. `login:1.2.3.4` or `register:user@example.com`. */
  key: string;
  /** Max allowed attempts per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Injected for deterministic tests; defaults to now. */
  now?: Date;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Ms until the oldest hit in the window expires; 0 when allowed. */
  retryAfterMs: number;
}

/**
 * DB-backed fixed-window rate limiter (PRD §10: persisted store, because
 * serverless instances do not share memory).
 *
 * One row per allowed attempt in `RateLimitHit`. Rows outside the window
 * are deleted on every call, so the table stays small without a cron job.
 * Known limit: check-then-insert is not atomic under concurrency (bursts can
 * overshoot by a few), and per-key pruning means distinct-key floods need a
 * periodic sweep — acceptable for M3/M4 mutation guards, not for auth
 * endpoints (those use the built-in persisted limiter).
 */
export async function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = new Date(),
}: ConsumeRateLimitArgs): Promise<RateLimitDecision> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("consumeRateLimit: limit must be a positive integer");
  }
  if (key.trim().length === 0) {
    throw new Error(
      "consumeRateLimit: key must be non-empty (an empty key would share one bucket across callers)",
    );
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("consumeRateLimit: windowMs must be positive");
  }
  const cutoff = new Date(now.getTime() - windowMs);
  await prisma.rateLimitHit.deleteMany({
    where: { key, createdAt: { lt: cutoff } },
  });
  const used = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: cutoff } },
  });
  if (used >= limit) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { key, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterMs = oldest
      ? Math.max(1, oldest.createdAt.getTime() + windowMs - now.getTime())
      : windowMs;
    return { allowed: false, retryAfterMs };
  }
  await prisma.rateLimitHit.create({ data: { key, createdAt: now } });
  return { allowed: true, retryAfterMs: 0 };
}

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/*
 * Prisma Client singleton (PRD §12: src/lib/db.ts).
 *
 * Prisma 7 requires a driver adapter; PrismaPg connects over `pg`. The
 * globalThis cache keeps a single instance across dev-server hot reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

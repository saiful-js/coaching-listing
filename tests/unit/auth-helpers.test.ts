import { beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";

type Resolver = () => Promise<{
  user: {
    id: string;
    email: string;
    role: "OWNER" | "ADMIN";
    emailVerified: boolean;
  };
} | null>;

let requireUser: (resolver?: Resolver) => Promise<{
  id: string;
  email: string;
  role: "OWNER" | "ADMIN";
  emailVerified: boolean;
}>;
let requireAdmin: typeof requireUser;
let requireOwnerOf: (
  coachingId: string,
  resolver?: Resolver,
) => Promise<{ id: string; ownerId: string }>;
let UnauthorizedError: new () => Error;
let ForbiddenError: new () => Error;
let NotFoundError: new () => Error;

const owner = () => ({
  user: {
    id: "guard-test-owner",
    email: "owner@example.com",
    role: "OWNER" as const,
    emailVerified: false,
  },
});
const other = () => ({
  user: {
    id: "guard-test-other",
    email: "other@example.com",
    role: "OWNER" as const,
    emailVerified: true,
  },
});
const admin = () => ({
  user: {
    id: "guard-test-admin",
    email: "admin@example.com",
    role: "ADMIN" as const,
    emailVerified: true,
  },
});
const anonymous = () => Promise.resolve(null);

describe("server guards (src/lib/auth-helpers.ts)", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({
      requireUser,
      requireAdmin,
      requireOwnerOf,
      UnauthorizedError,
      ForbiddenError,
      NotFoundError,
    } = await import("@/lib/auth-helpers"));
  });

  it("requireUser returns the session user", async () => {
    await expect(requireUser(async () => owner())).resolves.toMatchObject({
      id: "guard-test-owner",
      emailVerified: false,
    });
  });

  it("requireUser throws 401 when anonymous", async () => {
    await expect(requireUser(anonymous)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("requireAdmin passes admins and rejects owners with 403", async () => {
    await expect(requireAdmin(async () => admin())).resolves.toMatchObject({
      role: "ADMIN",
    });
    await expect(requireAdmin(async () => owner())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(requireAdmin(anonymous)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("requireOwnerOf enforces the PRD 404-not-403 rule", async () => {
    const { prisma } = await import("@/lib/db");
    const area = await prisma.area.findFirstOrThrow();
    for (const id of ["guard-test-owner", "guard-test-other"]) {
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: id,
          email: `${id}@example.com`,
          emailVerified: true,
        },
      });
    }
    const coaching = await prisma.coaching.create({
      data: {
        slug: `guard-test-${Date.now()}`,
        ownerId: "guard-test-owner",
        name: "Guard Test Coaching",
        description: "Ownership probe listing with sufficient length.",
        areaId: area.id,
        addressLine: "1 Test Road",
        phone: "+8801712345678",
      },
      select: { id: true },
    });

    try {
      await expect(
        requireOwnerOf(coaching.id, async () => owner()),
      ).resolves.toMatchObject({ id: coaching.id });
      // Cross-owner id → 404, not 403 (must not leak existence).
      await expect(
        requireOwnerOf(coaching.id, async () => other()),
      ).rejects.toBeInstanceOf(NotFoundError);
      // Missing id → 404 as well (indistinguishable).
      await expect(
        requireOwnerOf("nonexistent-id", async () => other()),
      ).rejects.toBeInstanceOf(NotFoundError);
      // Admin may access any existing listing.
      await expect(
        requireOwnerOf(coaching.id, async () => admin()),
      ).resolves.toMatchObject({ id: coaching.id });
      // Anonymous → 401.
      await expect(
        requireOwnerOf(coaching.id, anonymous),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    } finally {
      await prisma.coaching.deleteMany({
        where: { ownerId: { in: ["guard-test-owner", "guard-test-other"] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ["guard-test-owner", "guard-test-other"] } },
      });
      await prisma.$disconnect();
    }
  });
});

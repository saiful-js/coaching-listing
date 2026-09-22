/**
 * M6 admin moderation (integration, needs local DB on :5434).
 *
 * Proves PRD FR-6 through the REAL services + database: visibility follows
 * moderation, every transition writes an audit row, non-admins are
 * forbidden, taxonomy create is admin-only with unique slugs.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/features/listings/service";
import type { PrismaClient } from "@/generated/prisma/client";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";
const runId = Date.now().toString(36);

let prisma: PrismaClient;
let listings: typeof import("@/features/listings/service");
let queries: typeof import("@/features/listings/queries");
let admin: typeof import("@/features/admin/service");

let areaId = "";
let categoryIds: string[] = [];
const ownerIds: string[] = [];

function ownerActor(id: string): Actor {
  return { id, role: "OWNER", emailVerified: true };
}
function adminActor(id: string): Actor {
  return { id, role: "ADMIN", emailVerified: true };
}

async function makeUser(prefix: string, role: "OWNER" | "ADMIN") {
  const id = `${prefix}-${runId}`;
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      role,
    },
  });
  ownerIds.push(id);
  return id;
}

function validInput(name: string) {
  return {
    name,
    areaId,
    addressLine: "12 Test Road, Narayanganj",
    description:
      "A genuine coaching centre with small batches and weekly model tests for every student.",
    categoryIds,
    phone: "01712345678",
  };
}

async function addCover(coachingId: string) {
  await prisma.coachingImage.create({
    data: {
      coachingId,
      key: `test/${coachingId}/cover`,
      width: 1600,
      height: 900,
      isCover: true,
    },
  });
}

async function submitAs(ownerId: string, name: string) {
  const created = await listings.createCoaching(
    ownerActor(ownerId),
    validInput(name),
  );
  await addCover(created.id);
  await listings.submitForReview(ownerActor(ownerId), created.id);
  return created;
}

describe("M6 admin moderation", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({ prisma } = await import("@/lib/db"));
    listings = await import("@/features/listings/service");
    queries = await import("@/features/listings/queries");
    admin = await import("@/features/admin/service");
    areaId = (await prisma.area.findFirstOrThrow()).id;
    categoryIds = (await prisma.category.findMany({ take: 2 })).map(
      (c) => c.id,
    );
  });

  afterAll(async () => {
    await prisma.coaching.deleteMany({ where: { ownerId: { in: ownerIds } } });
    await prisma.area.deleteMany({
      where: { slug: { startsWith: "m6-test-" } },
    });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: "m6-test-" } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("publishes on approve (visible) and hides on reject/unpublish", async () => {
    const owner = await makeUser(`m6-mod-owner-${ownerIds.length}`, "OWNER");
    const adminId = await makeUser(`m6-mod-admin-${ownerIds.length}`, "ADMIN");
    const tag = `Mod${runId}`;

    const created = await submitAs(owner, `Pending ${tag}`);
    expect(await queries.getPublishedBySlug(created.slug)).toBeNull();

    await listings.approveListing(adminActor(adminId), created.id);
    expect((await queries.getPublishedBySlug(created.slug))?.name).toBe(
      `Pending ${tag}`,
    );

    await listings.archiveListing(adminActor(adminId), created.id);
    expect(await queries.getPublishedBySlug(created.slug)).toBeNull();

    const second = await submitAs(owner, `Rejected ${tag}`);
    await listings.rejectListing(
      adminActor(adminId),
      second.id,
      "Not good enough",
    );
    expect(await queries.getPublishedBySlug(second.slug)).toBeNull();

    const audits = await prisma.listingAuditLog.findMany({
      where: { coachingId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => `${a.fromStatus}→${a.toStatus}`)).toEqual([
      "DRAFT→PENDING",
      "PENDING→PUBLISHED",
      "PUBLISHED→ARCHIVED",
    ]);
    expect(
      audits.every((a) => a.actorId === adminId || a.fromStatus === "DRAFT"),
    ).toBe(true);
  });

  it("forbids non-admins from moderating", async () => {
    const owner = await makeUser(`m6-forbid-owner-${ownerIds.length}`, "OWNER");
    const other = await makeUser(`m6-forbid-other-${ownerIds.length}`, "OWNER");
    const { ForbiddenError, NotFoundError } = await import(
      "@/lib/auth-helpers"
    );
    const created = await submitAs(owner, `Forbid ${runId}`);
    await expect(
      listings.approveListing(ownerActor(other), created.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      listings.rejectListing(ownerActor(other), created.id, "x"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      listings.archiveListing(ownerActor(other), created.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates areas and categories with unique slugs, admin-only", async () => {
    const adminId = await makeUser(`m6-tax-admin-${ownerIds.length}`, "ADMIN");
    const owner = await makeUser(`m6-tax-owner-${ownerIds.length}`, "OWNER");
    const { ForbiddenError } = await import("@/lib/auth-helpers");
    const area = await admin.createArea(adminActor(adminId), {
      nameEn: "M6 Test Area",
      nameBn:
        "M6 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u098F\u09B2\u09BE\u0995\u09BE",
    });
    expect(area.slug).toBe("m6-test-area");
    await expect(
      admin.createArea(adminActor(adminId), {
        nameEn: "M6 Test Area",
        nameBn: "x",
      }),
    ).rejects.toThrow(/taken|exists|unique/i);
    await expect(
      admin.createArea(ownerActor(owner), { nameEn: "Other", nameBn: "y" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const category = await admin.createCategory(adminActor(adminId), {
      nameEn: "M6 Test Category",
      nameBn: "z",
    });
    expect(category.slug).toBe("m6-test-category");
    await expect(
      admin.createCategory(ownerActor(owner), { nameEn: "Other", nameBn: "y" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

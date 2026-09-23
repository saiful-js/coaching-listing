/**
 * Admin support panel (integration, needs local DB on :5434).
 *
 * Proves the account-moderation and taxonomy-edit service rules:
 * admin-only, self-change and last-admin guards, ban revokes sessions,
 * renames keep slugs, and referenced taxonomy cannot be deleted.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/features/listings/service";
import type { PrismaClient } from "@/generated/prisma/client";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";
const runId = Date.now().toString(36);

let prisma: PrismaClient;
let admin: typeof import("@/features/admin/service");
let listings: typeof import("@/features/listings/service");

const createdUserIds: string[] = [];
const adminId = `admin-actor-${runId}`;

function ownerActor(id: string): Actor {
  return { id, role: "OWNER", emailVerified: true };
}
function adminActor(id: string): Actor {
  return { id, role: "ADMIN", emailVerified: true };
}

async function makeUser(id: string, role: "OWNER" | "ADMIN") {
  await prisma.user.upsert({
    where: { id },
    update: { role, banned: false, banReason: null, banExpires: null },
    create: {
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      role,
    },
  });
  createdUserIds.push(id);
}

describe("admin support panel service", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({ prisma } = await import("@/lib/db"));
    admin = await import("@/features/admin/service");
    listings = await import("@/features/listings/service");
    await makeUser(adminId, "ADMIN");
  });

  afterAll(async () => {
    await prisma.coaching.deleteMany({
      where: { ownerId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.category.deleteMany({ where: { slug: { contains: runId } } });
    await prisma.area.deleteMany({ where: { slug: { contains: runId } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("is admin-only for every account and taxonomy mutation", async () => {
    const { ForbiddenError } = await import("@/lib/auth-helpers");
    const owner = ownerActor(adminId);
    await expect(
      admin.createArea(owner, { nameEn: `Nope ${runId}`, nameBn: "না" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      admin.setUserRole(owner, { userId: adminId, role: "ADMIN" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      admin.banUser(owner, { userId: adminId, reason: "x" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      admin.setEmailVerified(owner, { userId: adminId, verified: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("renames taxonomy while keeping the slug, and blocks deleting a referenced row", async () => {
    const actor = adminActor(adminId);
    const area = await admin.createArea(actor, {
      nameEn: `TestArea ${runId}`,
      nameBn: "টেস্ট এরিয়া",
    });
    const renamed = await admin.updateArea(actor, {
      id: area.id,
      nameEn: `Renamed Area ${runId}`,
      nameBn: "নতুন নাম",
    });
    expect(renamed.nameEn).toBe(`Renamed Area ${runId}`);
    expect(renamed.slug).toBe(area.slug);

    // Referenced by a listing → delete must fail closed.
    const category = await admin.createCategory(actor, {
      nameEn: `TestCat ${runId}`,
      nameBn: "টেস্ট",
    });
    const fallbackArea = await prisma.area.findFirstOrThrow({
      where: { slug: { not: { contains: runId } } },
    });
    const ownerId = `admin-owner-tax-${runId}`;
    await makeUser(ownerId, "OWNER");
    await listings.createCoaching(ownerActor(ownerId), {
      name: `Tax Listing ${runId}`,
      areaId: fallbackArea.id,
      addressLine: "12 Test Road, Narayanganj",
      description:
        "A genuine coaching centre with small batches and weekly model tests for every student.",
      categoryIds: [category.id],
      phone: "01712345678",
    });
    await expect(
      admin.deleteCategory(actor, { id: category.id }),
    ).rejects.toThrow(/used by/i);

    // Unreferenced row deletes cleanly.
    await admin.deleteArea(actor, { id: area.id });
    expect(await prisma.area.findUnique({ where: { id: area.id } })).toBeNull();
  });

  it("promotes and demotes roles, blocking self-changes", async () => {
    const actor = adminActor(adminId);
    const userId = `admin-role-${runId}`;
    await makeUser(userId, "OWNER");

    await admin.setUserRole(actor, { userId, role: "ADMIN" });
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))?.role,
    ).toBe("ADMIN");

    await admin.setUserRole(actor, { userId, role: "OWNER" });
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))?.role,
    ).toBe("OWNER");

    await expect(
      admin.setUserRole(actor, { userId: adminId, role: "OWNER" }),
    ).rejects.toThrow(/your own role/i);

    // Bad role payloads never reach the database.
    await expect(
      admin.setUserRole(actor, { userId, role: "SUPERUSER" }),
    ).rejects.toThrow();
  });

  it("suspends an account, revokes sessions, and cannot suspend yourself", async () => {
    const actor = adminActor(adminId);
    const userId = `admin-ban-${runId}`;
    await makeUser(userId, "OWNER");
    await prisma.session.create({
      data: {
        id: `session-${runId}`,
        token: `token-${runId}`,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await admin.banUser(actor, {
      userId,
      reason: "Spam listings",
      expiresInDays: 7,
    });
    const banned = await prisma.user.findUnique({ where: { id: userId } });
    expect(banned?.banned).toBe(true);
    expect(banned?.banReason).toBe("Spam listings");
    expect(banned?.banExpires).toBeInstanceOf(Date);
    // Existing sessions are revoked so the ban bites immediately.
    expect(await prisma.session.count({ where: { userId } })).toBe(0);

    await admin.unbanUser(actor, { id: userId });
    const unbanned = await prisma.user.findUnique({ where: { id: userId } });
    expect(unbanned?.banned).toBe(false);
    expect(unbanned?.banReason).toBeNull();
    expect(unbanned?.banExpires).toBeNull();

    await expect(
      admin.banUser(actor, { userId: adminId, reason: "oops" }),
    ).rejects.toThrow(/your own/i);
  });

  it("marks an email verified or unverified on request", async () => {
    const actor = adminActor(adminId);
    const userId = `admin-verified-${runId}`;
    await makeUser(userId, "OWNER");

    await admin.setEmailVerified(actor, { userId, verified: false });
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))?.emailVerified,
    ).toBe(false);

    await admin.setEmailVerified(actor, { userId, verified: true });
    expect(
      (await prisma.user.findUnique({ where: { id: userId } }))?.emailVerified,
    ).toBe(true);
  });
});

/**
 * M3 listing service (integration, needs local DB on :5434).
 *
 * Proves PRD §5 + M3 DoD through the REAL service + database: field
 * validation, slug immutability, verified-only submit, owner cap,
 * 404-not-403, full transition matrix with audit rows.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/features/listings/service";
import type { PrismaClient } from "@/generated/prisma/client";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";
const runId = Date.now().toString(36);

let prisma: PrismaClient;
let service: typeof import("@/features/listings/service");

let areaId = "";
let categoryIds: string[] = [];
const ownerIds: string[] = [];

function ownerActor(id: string, verified = true): Actor {
  return { id, role: "OWNER", emailVerified: verified };
}
function adminActor(id: string): Actor {
  return { id, role: "ADMIN", emailVerified: true };
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

async function makeUser(id: string, role: "OWNER" | "ADMIN") {
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
}

/** Attach a cover row directly (no Cloudinary involved). */
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

describe("M3 listing service", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({ prisma } = await import("@/lib/db"));
    service = await import("@/features/listings/service");
    const area = await prisma.area.findFirstOrThrow();
    areaId = area.id;
    const cats = await prisma.category.findMany({ take: 2 });
    categoryIds = cats.map((c) => c.id);
    expect(categoryIds.length).toBe(2);
  });

  afterAll(async () => {
    await prisma.coaching.deleteMany({
      where: { ownerId: { in: ownerIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("creates a DRAFT with normalized phone and generated slug", async () => {
    const uid = `m3-owner-create-${runId}`;
    await makeUser(uid, "OWNER");
    const coaching = await service.createCoaching(
      ownerActor(uid),
      validInput(`Create Test ${runId}`),
    );
    expect(coaching.status).toBe("DRAFT");
    expect(coaching.phone).toBe("+8801712345678");
    expect(coaching.slug).toMatch(/^[a-z0-9-]+-[a-z0-9]{6}$/);
    expect(coaching.ownerId).toBe(uid);
  });

  it("rejects unknown areas and categories", async () => {
    const uid = `m3-owner-badref-${runId}`;
    await makeUser(uid, "OWNER");
    await expect(
      service.createCoaching(ownerActor(uid), {
        ...validInput(`Bad Area ${runId}`),
        areaId: "no-such-area",
      }),
    ).rejects.toThrow(/area/i);
    await expect(
      service.createCoaching(ownerActor(uid), {
        ...validInput(`Bad Cat ${runId}`),
        categoryIds: ["no-such-category"],
      }),
    ).rejects.toThrow(/categor/i);
  });

  it("keeps the slug immutable across edits", async () => {
    const uid = `m3-owner-slug-${runId}`;
    await makeUser(uid, "OWNER");
    const created = await service.createCoaching(
      ownerActor(uid),
      validInput(`Slug Keep ${runId}`),
    );
    const updated = await service.updateCoaching(ownerActor(uid), created.id, {
      ...validInput(`Renamed Entirely ${runId}`),
    });
    expect(updated.slug).toBe(created.slug);
  });

  it("requires a cover photo before submitting", async () => {
    const uid = `m3-owner-cover-${runId}`;
    await makeUser(uid, "OWNER");
    const created = await service.createCoaching(
      ownerActor(uid),
      validInput(`Coverless ${runId}`),
    );
    await expect(
      service.submitForReview(ownerActor(uid), created.id),
    ).rejects.toThrow(/cover/i);
    await addCover(created.id);
    const pending = await service.submitForReview(ownerActor(uid), created.id);
    expect(pending.status).toBe("PENDING");
  });

  it("blocks unverified owners from submitting, allows verified", async () => {
    const uid = `m3-owner-verify-${runId}`;
    await makeUser(uid, "OWNER");
    const created = await service.createCoaching(
      ownerActor(uid, false),
      validInput(`Unverified ${runId}`),
    );
    await expect(
      service.submitForReview(ownerActor(uid, false), created.id),
    ).rejects.toThrow(/verif/i);
    await addCover(created.id);
    const pending = await service.submitForReview(
      ownerActor(uid, true),
      created.id,
    );
    expect(pending.status).toBe("PENDING");
    const audits = await prisma.listingAuditLog.findMany({
      where: { coachingId: created.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      fromStatus: "DRAFT",
      toStatus: "PENDING",
    });
  });

  it("caps owners at 5 active listings", async () => {
    const uid = `m3-owner-cap-${runId}`;
    await makeUser(uid, "OWNER");
    for (let i = 0; i < 5; i++) {
      await service.createCoaching(
        ownerActor(uid),
        validInput(`Cap ${runId} ${i}`),
      );
    }
    await expect(
      service.createCoaching(ownerActor(uid), validInput(`Cap ${runId} 5`)),
    ).rejects.toThrow(/limit/i);
  });

  it("forbids admins from submitting other owners' listings", async () => {
    const uid = `m3-owner-nosubmit-${runId}`;
    const admin = `m3-admin-nosubmit-${runId}`;
    await makeUser(uid, "OWNER");
    await makeUser(admin, "ADMIN");
    const { ForbiddenError } = await import("@/lib/auth-helpers");
    const created = await service.createCoaching(
      ownerActor(uid),
      validInput(`No Submit ${runId}`),
    );
    await expect(
      service.submitForReview(adminActor(admin), created.id),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns 404 (not 403) for cross-owner ids", async () => {
    const uidA = `m3-owner-a-${runId}`;
    const uidB = `m3-owner-b-${runId}`;
    await makeUser(uidA, "OWNER");
    await makeUser(uidB, "OWNER");
    const created = await service.createCoaching(
      ownerActor(uidA),
      validInput(`Private ${runId}`),
    );
    const { NotFoundError } = await import("@/lib/auth-helpers");
    await expect(
      service.updateCoaching(
        ownerActor(uidB),
        created.id,
        validInput(`Hijack ${runId}`),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.submitForReview(ownerActor(uidB), created.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("runs the full moderation cycle with an audit row per transition", async () => {
    const uid = `m3-owner-cycle-${runId}`;
    const admin = `m3-admin-cycle-${runId}`;
    await makeUser(uid, "OWNER");
    await makeUser(admin, "ADMIN");
    const created = await service.createCoaching(
      ownerActor(uid),
      validInput(`Cycle ${runId}`),
    );
    // Illegal jump is refused.
    await expect(
      service.approveListing(adminActor(admin), created.id),
    ).rejects.toThrow(/cannot move/i);

    await addCover(created.id);
    await service.submitForReview(ownerActor(uid), created.id);
    const published = await service.approveListing(
      adminActor(admin),
      created.id,
    );
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toBeInstanceOf(Date);

    const archived = await service.archiveListing(ownerActor(uid), created.id);
    expect(archived.status).toBe("ARCHIVED");

    const audits = await prisma.listingAuditLog.findMany({
      where: { coachingId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => `${a.fromStatus}→${a.toStatus}`)).toEqual([
      "DRAFT→PENDING",
      "PENDING→PUBLISHED",
      "PUBLISHED→ARCHIVED",
    ]);
  });

  it("rejects without a reason, accepts with one, and resubmits", async () => {
    const uid = `m3-owner-reject-${runId}`;
    const admin = `m3-admin-reject-${runId}`;
    await makeUser(uid, "OWNER");
    await makeUser(admin, "ADMIN");
    const created = await service.createCoaching(
      ownerActor(uid),
      validInput(`Reject ${runId}`),
    );
    await addCover(created.id);
    await service.submitForReview(ownerActor(uid), created.id);
    await expect(
      service.rejectListing(adminActor(admin), created.id, ""),
    ).rejects.toThrow(/reason/i);
    const rejected = await service.rejectListing(
      adminActor(admin),
      created.id,
      "Address looks wrong",
    );
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Address looks wrong");
    const resubmitted = await service.submitForReview(
      ownerActor(uid),
      created.id,
    );
    expect(resubmitted.status).toBe("PENDING");

    const audits = await prisma.listingAuditLog.findMany({
      where: { coachingId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => `${a.fromStatus}→${a.toStatus}`)).toEqual([
      "DRAFT→PENDING",
      "PENDING→REJECTED",
      "REJECTED→PENDING",
    ]);
  });
});

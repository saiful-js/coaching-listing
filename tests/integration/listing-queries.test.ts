/**
 * M5 listing queries (integration, needs local DB on :5434).
 *
 * Proves PRD FR-4/FR-5 through the REAL queries + database: only PUBLISHED
 * is ever listed, stable ordering, pagination, search, and filters.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/features/listings/service";
import type { PrismaClient } from "@/generated/prisma/client";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";
const runId = Date.now().toString(36);

let prisma: PrismaClient;
let service: typeof import("@/features/listings/service");
let queries: typeof import("@/features/listings/queries");

let areaId = "";
let areaSlug = "";
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

function validInput(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    areaId,
    addressLine: "12 Test Road, Narayanganj",
    description:
      "A genuine coaching centre with small batches and weekly model tests for every student.",
    categoryIds,
    phone: "01712345678",
    ...overrides,
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

async function publish(
  ownerId: string,
  adminId: string,
  name: string,
  overrides = {},
) {
  const created = await service.createCoaching(
    ownerActor(ownerId),
    validInput(name, overrides),
  );
  await addCover(created.id);
  await service.submitForReview(ownerActor(ownerId), created.id);
  return service.approveListing(adminActor(adminId), created.id);
}

describe("M5 listing queries", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    ({ prisma } = await import("@/lib/db"));
    service = await import("@/features/listings/service");
    queries = await import("@/features/listings/queries");
    const area = await prisma.area.findFirstOrThrow();
    areaId = area.id;
    areaSlug = area.slug;
    categoryIds = (await prisma.category.findMany({ take: 2 })).map(
      (c) => c.id,
    );
  });

  afterAll(async () => {
    await prisma.coaching.deleteMany({ where: { ownerId: { in: ownerIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("lists only PUBLISHED listings", async () => {
    const owner = await makeUser(`m5-vis-owner-${ownerIds.length}`, "OWNER");
    const admin = await makeUser(`m5-vis-admin-${ownerIds.length}`, "ADMIN");
    const tag = `Vis${runId}`;
    await service.createCoaching(ownerActor(owner), validInput(`DRAFT ${tag}`));
    const pending = await service.createCoaching(
      ownerActor(owner),
      validInput(`PENDING ${tag}`),
    );
    await addCover(pending.id);
    await service.submitForReview(ownerActor(owner), pending.id);
    const rejected = await service.createCoaching(
      ownerActor(owner),
      validInput(`REJECTED ${tag}`),
    );
    await addCover(rejected.id);
    await service.submitForReview(ownerActor(owner), rejected.id);
    await service.rejectListing(adminActor(admin), rejected.id, "nope");
    const pub = await publish(owner, admin, `PUB ${tag}`);
    const archived = await service.createCoaching(
      ownerActor(owner),
      validInput(`ARCH ${tag}`),
    );
    await addCover(archived.id);
    await service.submitForReview(ownerActor(owner), archived.id);
    await service.approveListing(adminActor(admin), archived.id);
    await service.archiveListing(ownerActor(owner), archived.id);

    const { items } = await queries.listPublished({ q: tag });
    const names = items.map((i) => i.name);
    expect(names).toContain(`PUB ${tag}`);
    expect(names).not.toContain(`DRAFT ${tag}`);
    expect(names).not.toContain(`PENDING ${tag}`);
    expect(names).not.toContain(`REJECTED ${tag}`);
    expect(names).not.toContain(`ARCH ${tag}`);
    expect(pub.status).toBe("PUBLISHED");
  });

  it("orders by publishedAt desc and paginates 12 per page", async () => {
    const owner = await makeUser(`m5-page-owner-${ownerIds.length}`, "OWNER");
    const admin = await makeUser(`m5-page-admin-${ownerIds.length}`, "ADMIN");
    // Owner cap is 5 — spread across owners.
    const owners = [owner];
    for (let i = 0; i < 2; i++) {
      owners.push(await makeUser(`m5-page-owner-${ownerIds.length}`, "OWNER"));
    }
    const tag = `Page${runId}`;
    for (let i = 0; i < 13; i++) {
      await publish(
        owners[Math.floor(i / 5)]!,
        admin,
        `${tag} ${i.toString().padStart(2, "0")}`,
      );
    }
    const page1 = await queries.listPublished({ q: tag, page: 1 });
    const page2 = await queries.listPublished({ q: tag, page: 2 });
    expect(page1.total).toBe(13);
    expect(page1.pages).toBe(2);
    expect(page1.items).toHaveLength(12);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0]?.name).toBe(`${tag} 12`);
    expect(page2.items[0]?.name).toBe(`${tag} 00`);
  });

  it("searches name, address, and details case-insensitively", async () => {
    const owner = await makeUser(`m5-search-owner-${ownerIds.length}`, "OWNER");
    const admin = await makeUser(`m5-search-admin-${ownerIds.length}`, "ADMIN");
    const tag = `UnIqUe${runId}`;
    await publish(owner, admin, `Alpha ${tag}`, {
      addressLine: "99 Zinc Road",
      description: "Model tests every Friday for all batches here.",
    });
    const byName = await queries.listPublished({ q: tag.toLowerCase() });
    expect(byName.items.map((i) => i.name)).toContain(`Alpha ${tag}`);
    const byAddress = await queries.listPublished({ q: "zinc road" });
    expect(byAddress.items.map((i) => i.name)).toContain(`Alpha ${tag}`);
    const byDetails = await queries.listPublished({ q: "FRIDAY" });
    expect(byDetails.items.map((i) => i.name)).toContain(`Alpha ${tag}`);
    const miss = await queries.listPublished({ q: `zzz-no-match-${runId}` });
    expect(miss.items).toHaveLength(0);
    expect(miss.total).toBe(0);
  });

  it("filters by area and category", async () => {
    const owner = await makeUser(`m5-filt-owner-${ownerIds.length}`, "OWNER");
    const admin = await makeUser(`m5-filt-admin-${ownerIds.length}`, "ADMIN");
    const tag = `Filt${runId}`;
    const areas = await prisma.area.findMany({ take: 2 });
    const otherArea = areas.find((a) => a.id !== areaId)!;
    await publish(owner, admin, `In Area ${tag}`, { areaId: otherArea.id });
    await publish(owner, admin, `Cat One ${tag}`, {
      categoryIds: [categoryIds[0]!],
    });
    const inArea = await queries.listPublished({
      q: tag,
      areaSlug: otherArea.slug,
    });
    expect(inArea.items.map((i) => i.name)).toEqual([`In Area ${tag}`]);
    const inCat = await queries.listPublished({
      q: tag,
      categorySlug: (
        await prisma.category.findUniqueOrThrow({
          where: { id: categoryIds[1]! },
        })
      ).slug,
    });
    expect(inCat.total).toBeGreaterThanOrEqual(1);
    expect(inCat.items.every((i) => i.name.includes(tag))).toBe(true);
  });

  it("returns detail only for published slugs", async () => {
    const owner = await makeUser(`m5-det-owner-${ownerIds.length}`, "OWNER");
    const admin = await makeUser(`m5-det-admin-${ownerIds.length}`, "ADMIN");
    const tag = `Det${runId}`;
    const pub = await publish(owner, admin, `Detail ${tag}`);
    const detail = await queries.getPublishedBySlug(pub.slug);
    expect(detail?.name).toBe(`Detail ${tag}`);
    expect(detail?.categories.length).toBe(2);
    expect(detail?.images.length).toBe(1);
    const draft = await service.createCoaching(
      ownerActor(owner),
      validInput(`Draft ${tag}`),
    );
    expect(await queries.getPublishedBySlug(draft.slug)).toBeNull();
    expect(await queries.getPublishedBySlug("no-such-slug")).toBeNull();
  });

  it("serves area landing data and latest listings", async () => {
    const landing = await queries.getAreaWithListings(areaSlug);
    expect(landing?.area.slug).toBe(areaSlug);
    expect(landing?.items.every((i) => i.area.slug === areaSlug)).toBe(true);
    expect(await queries.getAreaWithListings("no-such-area")).toBeNull();
    const latest = await queries.latestPublished(3);
    expect(latest.length).toBeLessThanOrEqual(3);
    expect(latest.every((i) => typeof i.slug === "string")).toBe(true);
  });

  it("normalizes bad page numbers to page 1", async () => {
    const first = await queries.listPublished({ page: 0 });
    expect(first.page).toBe(1);
    const nan = await queries.listPublished({ page: Number.NaN });
    expect(nan.page).toBe(1);
  });
});

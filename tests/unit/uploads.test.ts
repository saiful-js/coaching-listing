/**
 * M4 uploads (unit, needs local DB on :5434).
 *
 * The Cloudinary SDK is never touched here: tests inject a fake client
 * through the service seam. Real-credential proof is one E2E upload in T6.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/features/listings/service";
import type {
  CloudinaryUploader,
  UploadedImage,
} from "@/features/uploads/cloudinary-client";
import type { PrismaClient } from "@/generated/prisma/client";

const DATABASE_URL =
  "postgresql://coaching:coaching@localhost:5434/coaching_ngj";
const runId = Date.now().toString(36);

let prisma: PrismaClient;
let uploads: typeof import("@/features/uploads/service");

const destroyed: string[] = [];
let uploadCount = 0;
const fakeClient: CloudinaryUploader = {
  async upload(
    _buffer: Buffer,
    options: { folder: string },
  ): Promise<UploadedImage> {
    uploadCount += 1;
    return {
      publicId: `${options.folder}/fake-${runId}-${uploadCount}`,
      width: 1600,
      height: 900,
    };
  },
  async destroy(publicId: string): Promise<void> {
    destroyed.push(publicId);
  },
};

function ownerActor(id: string): Actor {
  return { id, role: "OWNER", emailVerified: true };
}

function jpeg(size = 100): {
  bytes: Buffer;
  contentType: string;
  size: number;
} {
  return { bytes: Buffer.alloc(size, 0xff), contentType: "image/jpeg", size };
}

const ownerIds: string[] = [];

async function makeOwner(): Promise<string> {
  const id = `m4-owner-${runId}-${ownerIds.length}`;
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, name: id, email: `${id}@example.com`, emailVerified: true },
  });
  ownerIds.push(id);
  return id;
}

async function makeCoaching(ownerId: string, name: string) {
  const area = await prisma.area.findFirstOrThrow();
  return prisma.coaching.create({
    data: {
      slug: `m4-${runId}-${Math.random().toString(36).slice(2, 8)}`,
      ownerId,
      name,
      description: "A coaching with enough description length for tests.",
      areaId: area.id,
      addressLine: "12 Test Road",
      phone: "+8801712345678",
    },
  });
}

describe("M4 uploads service", () => {
  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "test-cloud");
    ({ prisma } = await import("@/lib/db"));
    uploads = await import("@/features/uploads/service");
  });

  afterAll(async () => {
    await prisma.coaching.deleteMany({
      where: { ownerId: { in: ownerIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("uploads a valid image and auto-covers the first one", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Upload ${runId}`);
    const image = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    expect(image.key).toContain(`coachings/${coaching.id}/fake-`);
    expect(image.width).toBe(1600);
    expect(image.isCover).toBe(true);
  });

  it("keeps exactly one cover when a new cover arrives", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Cover ${runId}`);
    const first = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    const second = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
      { asCover: true },
    );
    const covers = await prisma.coachingImage.findMany({
      where: { coachingId: coaching.id, isCover: true },
    });
    expect(covers).toHaveLength(1);
    expect(covers[0]?.id).toBe(second.id);
    expect(first.id).not.toBe(second.id);
  });

  it("rejects bad types, oversize files, and missing config", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Reject ${runId}`);
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        { bytes: Buffer.alloc(10), contentType: "image/gif", size: 10 },
        fakeClient,
      ),
    ).rejects.toThrow(/type/i);
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        { bytes: Buffer.alloc(10), contentType: "application/pdf", size: 10 },
        fakeClient,
      ),
    ).rejects.toThrow(/type/i);
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        {
          bytes: Buffer.alloc(10),
          contentType: "image/png",
          size: 6 * 1024 * 1024,
        },
        fakeClient,
      ),
    ).rejects.toThrow(/size|5 ?MB/i);
    // No injected client + no credentials in this env → loud failure.
    await expect(
      uploads.uploadCoachingImage(ownerActor(uid), coaching.id, jpeg()),
    ).rejects.toThrow(/not configured/i);
  });

  it("rejects the 7th image (1 cover + 5 gallery max)", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Cap ${runId}`);
    for (let i = 0; i < 6; i++) {
      await uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        jpeg(),
        fakeClient,
      );
    }
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        jpeg(),
        fakeClient,
      ),
    ).rejects.toThrow(/limit|max|6/i);
  });

  it("returns 404 for cross-owner uploads and deletes", async () => {
    const uidA = await makeOwner();
    const uidB = await makeOwner();
    const coaching = await makeCoaching(uidA, `Private ${runId}`);
    const { NotFoundError } = await import("@/lib/auth-helpers");
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uidB),
        coaching.id,
        jpeg(),
        fakeClient,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    const image = await uploads.uploadCoachingImage(
      ownerActor(uidA),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    await expect(
      uploads.deleteCoachingImage(ownerActor(uidB), image.id, fakeClient),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes the row and destroys the cloud object", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Delete ${runId}`);
    const image = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    await uploads.deleteCoachingImage(ownerActor(uid), image.id, fakeClient);
    expect(destroyed).toContain(image.key);
    const gone = await prisma.coachingImage.findUnique({
      where: { id: image.id },
    });
    expect(gone).toBeNull();
  });

  it("flips the cover with setCoverImage", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `SetCover ${runId}`);
    const first = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    const second = await uploads.uploadCoachingImage(
      ownerActor(uid),
      coaching.id,
      jpeg(),
      fakeClient,
    );
    await uploads.setCoverImage(ownerActor(uid), second.id);
    const covers = await prisma.coachingImage.findMany({
      where: { coachingId: coaching.id, isCover: true },
    });
    expect(covers.map((c) => c.id)).toEqual([second.id]);
    expect(first.id).not.toBe(second.id);
  });

  it("enforces single-cover at the database level", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `DbCover ${runId}`);
    await prisma.coachingImage.create({
      data: {
        coachingId: coaching.id,
        key: `test/${runId}/c1`,
        width: 100,
        height: 100,
        isCover: true,
      },
    });
    await expect(
      prisma.coachingImage.create({
        data: {
          coachingId: coaching.id,
          key: `test/${runId}/c2`,
          width: 100,
          height: 100,
          isCover: true,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("cleans up the cloud object when the DB write fails", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Orphan ${runId}`);
    await prisma.coachingImage.create({
      data: {
        coachingId: coaching.id,
        key: "test/colliding-key",
        width: 100,
        height: 100,
        isCover: false,
      },
    });
    const collidingClient: CloudinaryUploader = {
      ...fakeClient,
      upload: async () => ({
        publicId: "test/colliding-key",
        width: 1,
        height: 1,
      }),
    };
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        jpeg(),
        collidingClient,
      ),
    ).rejects.toThrow(/collided/i);
    expect(destroyed).toContain("test/colliding-key");
  });

  it("rate-limits uploads per owner", async () => {
    const uid = await makeOwner();
    const coachings = [];
    for (let i = 0; i < 4; i++) {
      coachings.push(await makeCoaching(uid, `Rate ${runId} ${i}`));
    }
    for (let i = 0; i < 20; i++) {
      await uploads.uploadCoachingImage(
        ownerActor(uid),
        coachings[i % 4]!.id,
        jpeg(),
        fakeClient,
      );
    }
    const { RateLimitedError } = await import("@/features/listings/service");
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coachings[0]!.id,
        jpeg(),
        fakeClient,
      ),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("checks the actual byte length, not only the claimed size", async () => {
    const uid = await makeOwner();
    const coaching = await makeCoaching(uid, `Bytes ${runId}`);
    await expect(
      uploads.uploadCoachingImage(
        ownerActor(uid),
        coaching.id,
        {
          bytes: Buffer.alloc(6 * 1024 * 1024),
          contentType: "image/jpeg",
          size: 100,
        },
        fakeClient,
      ),
    ).rejects.toThrow(/5 ?MB/i);
  });
});

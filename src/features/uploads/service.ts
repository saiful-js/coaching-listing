import type { Actor } from "@/features/listings/service";
import { actorResolver, RateLimitedError } from "@/features/listings/service";
import {
  type CloudinaryUploader,
  getCloudinaryClient,
} from "@/features/uploads/cloudinary-client";
import type { CoachingImage } from "@/generated/prisma/client";
import { NotFoundError, requireOwnerOf } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export interface IncomingFile {
  bytes: Buffer;
  contentType: string;
  size: number;
}

/** 1 cover + 5 gallery (PRD A7). */
export const MAX_IMAGES_PER_LISTING = 6;
/** 5 MB before upload (PRD A7); Cloudinary transforms handle the rest. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function assertValidFile(file: IncomingFile) {
  if (!ALLOWED_TYPES.has(file.contentType)) {
    throw new Error("Only JPEG, PNG, or WebP image types are allowed.");
  }
  // Check the bytes actually forwarded, not only the claimed size.
  if (
    file.size <= 0 ||
    file.size > MAX_IMAGE_BYTES ||
    file.bytes.length > MAX_IMAGE_BYTES
  ) {
    throw new Error("Each image must be 5 MB or smaller.");
  }
  if (file.bytes.length === 0) {
    throw new Error("Empty file.");
  }
}

/** Ownership guard (404-not-403) plus the full row. */
async function ownedCoachingOr404(actor: Actor, coachingId: string) {
  await requireOwnerOf(coachingId, actorResolver(actor));
  const coaching = await prisma.coaching.findUnique({
    where: { id: coachingId },
  });
  if (!coaching) {
    throw new NotFoundError();
  }
  return coaching;
}

export async function uploadCoachingImage(
  actor: Actor,
  coachingId: string,
  file: IncomingFile,
  client: CloudinaryUploader = getCloudinaryClient(),
  options: { asCover?: boolean } = {},
): Promise<CoachingImage> {
  assertValidFile(file);
  // Quota burner guard (PRD §10): uploads cost Cloudinary quota + server
  // memory per request; loop upload→delete is the abuse shape.
  const budget = await consumeRateLimit({
    key: `upload-image:${actor.id}`,
    limit: 20,
    windowMs: 3_600_000,
  });
  if (!budget.allowed) {
    throw new RateLimitedError();
  }
  await ownedCoachingOr404(actor, coachingId);
  const existing = await prisma.coachingImage.findMany({
    where: { coachingId },
    select: { id: true, isCover: true },
  });
  if (existing.length >= MAX_IMAGES_PER_LISTING) {
    throw new Error(
      `Image limit reached (${MAX_IMAGES_PER_LISTING} per listing).`,
    );
  }
  // First image is always the cover; an explicit asCover demotes the rest.
  const makeCover = existing.length === 0 || options.asCover === true;
  const uploaded = await client.upload(file.bytes, {
    folder: `coachings/${coachingId}`,
  });
  try {
    return await prisma.$transaction(async (tx) => {
      if (makeCover) {
        await tx.coachingImage.updateMany({
          where: { coachingId },
          data: { isCover: false },
        });
      }
      return tx.coachingImage.create({
        data: {
          coachingId,
          key: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          isCover: makeCover,
          sortOrder: existing.length,
        },
      });
    });
  } catch (error) {
    // The cloud object has no DB row pointing at it — best-effort cleanup
    // so a failed write cannot strand billable storage (see IM-04).
    await client.destroy(uploaded.publicId).catch(() => {});
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new Error("That upload collided. Try again.");
    }
    throw error;
  }
}

async function ownedImageOr404(actor: Actor, imageId: string) {
  const image = await prisma.coachingImage.findUnique({
    where: { id: imageId },
  });
  if (!image) {
    throw new NotFoundError();
  }
  await requireOwnerOf(image.coachingId, actorResolver(actor));
  return image;
}

export async function deleteCoachingImage(
  actor: Actor,
  imageId: string,
  client: CloudinaryUploader = getCloudinaryClient(),
): Promise<void> {
  const image = await ownedImageOr404(actor, imageId);
  try {
    await client.destroy(image.key);
  } catch (error) {
    // The DB row is the source of truth for what we show; a cloud object
    // that is already gone (or briefly unreachable) must not strand it.
    // Log the key so orphans stay enumerable for the future sweeper.
    console.error("Cloudinary destroy failed", { key: image.key, error });
  }
  const deleted = await prisma.coachingImage.delete({ where: { id: imageId } });
  if (deleted.isCover) {
    const next = await prisma.coachingImage.findFirst({
      where: { coachingId: deleted.coachingId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (next) {
      await prisma.coachingImage.update({
        where: { id: next.id },
        data: { isCover: true },
      });
    }
  }
}

export async function setCoverImage(
  actor: Actor,
  imageId: string,
): Promise<CoachingImage> {
  const image = await ownedImageOr404(actor, imageId);
  return prisma.$transaction(async (tx) => {
    await tx.coachingImage.updateMany({
      where: { coachingId: image.coachingId },
      data: { isCover: false },
    });
    return tx.coachingImage.update({
      where: { id: imageId },
      data: { isCover: true },
    });
  });
}

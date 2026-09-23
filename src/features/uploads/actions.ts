"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { resolveActor } from "@/features/listings/service";
import {
  deleteCoachingImage,
  setCoverImage,
  uploadCoachingImage,
} from "@/features/uploads/service";
import { revalidatePublicListings } from "@/lib/revalidate";

export interface UploadActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const idSchema = z.string().min(1).max(100);

/**
 * Default-deny error mapping: only known-safe messages reach the client.
 * Third-party text (Cloudinary, Prisma, network) is logged server-side and
 * replaced — error objects can carry cloud names and request internals.
 */
const SAFE_MESSAGE_PREFIXES = [
  "Only JPEG",
  "Each image must be",
  "Image limit reached",
  "Choose an image file first.",
  "Empty file.",
  "Add a cover photo",
  "Not found",
  "Forbidden",
  "Too many attempts",
  "Image uploads are not configured.",
  "That upload collided.",
];

function toError(error: unknown): UploadActionResult {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
  }
  if (
    error instanceof Error &&
    SAFE_MESSAGE_PREFIXES.some((prefix) => error.message.startsWith(prefix))
  ) {
    return { ok: false, error: error.message };
  }
  console.error("Upload action failed", error);
  return { ok: false, error: "Something went wrong." };
}

/** Thin wrappers: resolve the actor, delegate to the service, revalidate. */
export async function uploadImageAction(
  coachingId: string,
  formData: FormData,
  asCover = false,
): Promise<UploadActionResult> {
  try {
    const id = idSchema.parse(coachingId);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an image file first." };
    }
    const actor = await resolveActor();
    const image = await uploadCoachingImage(
      actor,
      id,
      {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        size: file.size,
      },
      undefined,
      { asCover },
    );
    revalidatePath("/dashboard");
    // A published listing's cover/photo set is part of its home card.
    revalidatePublicListings();
    return { ok: true, id: image.id };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteImageAction(
  imageId: string,
): Promise<UploadActionResult> {
  try {
    const id = idSchema.parse(imageId);
    const actor = await resolveActor();
    await deleteCoachingImage(actor, id);
    revalidatePath("/dashboard");
    revalidatePublicListings();
    return { ok: true, id };
  } catch (error) {
    return toError(error);
  }
}

export async function setCoverAction(
  imageId: string,
): Promise<UploadActionResult> {
  try {
    const id = idSchema.parse(imageId);
    const actor = await resolveActor();
    const image = await setCoverImage(actor, id);
    revalidatePath("/dashboard");
    revalidatePublicListings();
    return { ok: true, id: image.id };
  } catch (error) {
    return toError(error);
  }
}

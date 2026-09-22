"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { resolveActor } from "@/features/listings/service";
import {
  deleteCoachingImage,
  setCoverImage,
  uploadCoachingImage,
} from "@/features/uploads/service";

export interface UploadActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function toError(error: unknown): UploadActionResult {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
  }
  if (error instanceof Error && !("code" in error)) {
    return { ok: false, error: error.message };
  }
  console.error("Upload action failed");
  return { ok: false, error: "Something went wrong." };
}

/** Thin wrappers: resolve the actor, delegate to the service, revalidate. */
export async function uploadImageAction(
  coachingId: string,
  formData: FormData,
  asCover = false,
): Promise<UploadActionResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an image file first." };
    }
    const actor = await resolveActor();
    const image = await uploadCoachingImage(
      actor,
      coachingId,
      {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        size: file.size,
      },
      undefined,
      { asCover },
    );
    revalidatePath("/dashboard");
    return { ok: true, id: image.id };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteImageAction(
  imageId: string,
): Promise<UploadActionResult> {
  try {
    const actor = await resolveActor();
    await deleteCoachingImage(actor, imageId);
    revalidatePath("/dashboard");
    return { ok: true, id: imageId };
  } catch (error) {
    return toError(error);
  }
}

export async function setCoverAction(
  imageId: string,
): Promise<UploadActionResult> {
  try {
    const actor = await resolveActor();
    const image = await setCoverImage(actor, imageId);
    revalidatePath("/dashboard");
    return { ok: true, id: image.id };
  } catch (error) {
    return toError(error);
  }
}

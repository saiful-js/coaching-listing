"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { createArea, createCategory } from "@/features/admin/service";
import {
  approveListing,
  archiveListing,
  rejectListing,
  resolveActor,
} from "@/features/listings/service";

export interface AdminActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const idSchema = z.string().min(1).max(100);

function toError(error: unknown): AdminActionResult {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
  }
  if (error instanceof Error) {
    // Admins see service messages (needed for moderation UX); raw DB error
    // text stays server-side.
    if ("code" in error) {
      console.error("Admin action failed", error);
      return { ok: false, error: "Something went wrong." };
    }
    return { ok: false, error: error.message };
  }
  console.error("Admin action failed");
  return { ok: false, error: "Something went wrong." };
}

export async function approveListingAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(id);
    const actor = await resolveActor();
    const coaching = await approveListing(actor, parsed);
    revalidatePath("/admin/listings");
    return { ok: true, id: coaching.id };
  } catch (error) {
    return toError(error);
  }
}

export async function rejectListingAction(
  id: string,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const parsedId = idSchema.parse(id);
    const actor = await resolveActor();
    const coaching = await rejectListing(actor, parsedId, reason);
    revalidatePath("/admin/listings");
    return { ok: true, id: coaching.id };
  } catch (error) {
    return toError(error);
  }
}

export async function unpublishListingAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(id);
    const actor = await resolveActor();
    const coaching = await archiveListing(actor, parsed);
    revalidatePath("/admin/listings");
    return { ok: true, id: coaching.id };
  } catch (error) {
    return toError(error);
  }
}

export async function createAreaAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const actor = await resolveActor();
    const area = await createArea(actor, input);
    revalidatePath("/admin/taxonomy");
    return { ok: true, id: area.id };
  } catch (error) {
    return toError(error);
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const actor = await resolveActor();
    const category = await createCategory(actor, input);
    revalidatePath("/admin/taxonomy");
    return { ok: true, id: category.id };
  } catch (error) {
    return toError(error);
  }
}

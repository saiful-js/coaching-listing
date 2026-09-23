"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  archiveListing,
  createCoaching,
  deleteCoaching,
  resolveActor,
  submitForReview,
  updateCoaching,
} from "@/features/listings/service";
import { destroyImageObjects } from "@/features/uploads";
import { revalidatePublicListings } from "@/lib/revalidate";

export interface ActionResult {
  ok: boolean;
  id?: string;
  slug?: string;
  error?: string;
}

function toResult(
  id: string | undefined,
  slug: string | undefined,
): ActionResult {
  return { ok: true, id, slug };
}

function toError(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
  }
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

/** Thin wrappers: resolve the actor, delegate to the service, revalidate. */
export async function createListingAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    const coaching = await createCoaching(actor, input);
    revalidatePath("/dashboard");
    return toResult(coaching.id, coaching.slug);
  } catch (error) {
    return toError(error);
  }
}

export async function updateListingAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    const coaching = await updateCoaching(actor, id, input);
    revalidatePath("/dashboard");
    // An edit to a published listing changes its public card.
    revalidatePublicListings();
    return toResult(coaching.id, coaching.slug);
  } catch (error) {
    return toError(error);
  }
}

export async function submitListingAction(id: string): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    const coaching = await submitForReview(actor, id);
    revalidatePath("/dashboard");
    return toResult(coaching.id, coaching.slug);
  } catch (error) {
    return toError(error);
  }
}

export async function archiveListingAction(id: string): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    const coaching = await archiveListing(actor, id);
    revalidatePath("/dashboard");
    // Archiving a published listing must drop it from the home page.
    revalidatePublicListings();
    return toResult(coaching.id, coaching.slug);
  } catch (error) {
    return toError(error);
  }
}

export async function deleteListingAction(id: string): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    await deleteCoaching(actor, id, destroyImageObjects);
    revalidatePath("/dashboard");
    revalidatePath("/admin/listings");
    revalidatePublicListings();
    return { ok: true };
  } catch (error) {
    return toError(error);
  }
}

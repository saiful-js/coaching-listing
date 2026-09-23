"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ZodError, z } from "zod";
import {
  banUser,
  createArea,
  createCategory,
  deleteArea,
  deleteCategory,
  getSupportTarget,
  setEmailVerified,
  setUserRole,
  unbanUser,
  updateArea,
  updateCategory,
} from "@/features/admin/service";
import {
  type Actor,
  approveListing,
  archiveListing,
  rejectListing,
  resolveActor,
} from "@/features/listings/service";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { revalidatePublicListings } from "@/lib/revalidate";

export interface AdminActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const idSchema = z.string().min(1).max(100);
const reasonSchema = z.string().trim().min(1).max(2000);
const roleSchema = z.enum(["OWNER", "ADMIN"]);
const expiresInDaysSchema = z.number().int().min(1).max(3650).nullish();

/**
 * Tell the owner a decision was made. Best-effort: the status change is
 * already committed, so a mail failure must never fail the action — log and
 * carry on (the owner still sees the new status on their dashboard).
 */
async function notifyOwner(
  actor: Actor,
  coaching: { ownerId: string; name: string; slug: string },
  kind: "approved" | "rejected",
  reason?: string,
): Promise<void> {
  try {
    const owner = await getSupportTarget(actor, coaching.ownerId);
    const isApproved = kind === "approved";
    await sendEmail({
      to: owner.email,
      subject: isApproved
        ? `Your listing "${coaching.name}" is live`
        : `Your listing "${coaching.name}" needs changes`,
      text: isApproved
        ? `Good news — "${coaching.name}" has been reviewed and published.\n\nSee it live: ${env.APP_URL}/coachings/${coaching.slug}\n\nYou can edit it any time from your dashboard: ${env.APP_URL}/dashboard`
        : `"${coaching.name}" wasn't published yet.\n\nReviewer note:\n${reason ?? "(no reason given)"}\n\nFix the issue and submit again: ${env.APP_URL}/dashboard`,
    });
  } catch (error) {
    console.error("Owner notification failed", error);
  }
}

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
    // Approval is what makes a listing public: update the home page now
    // instead of waiting for its 5-minute ISR window.
    revalidatePublicListings();
    await notifyOwner(actor, coaching, "approved");
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
    const parsedReason = reasonSchema.parse(reason);
    const actor = await resolveActor();
    const coaching = await rejectListing(actor, parsedId, parsedReason);
    revalidatePath("/admin/listings");
    await notifyOwner(actor, coaching, "rejected", parsedReason);
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
    // Unpublishing a live listing must drop it from the home page.
    revalidatePublicListings();
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
    // Home shows area chips + counts, so it is stale too.
    revalidatePublicListings();
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
    revalidatePublicListings();
    return { ok: true, id: category.id };
  } catch (error) {
    return toError(error);
  }
}

function revalidateTaxonomy(): void {
  revalidatePath("/admin/taxonomy");
  revalidatePublicListings();
}

export async function updateAreaAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const actor = await resolveActor();
    const area = await updateArea(actor, input);
    revalidateTaxonomy();
    return { ok: true, id: area.id };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteAreaAction(id: string): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(id);
    const actor = await resolveActor();
    await deleteArea(actor, { id: parsed });
    revalidateTaxonomy();
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

export async function updateCategoryAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const actor = await resolveActor();
    const category = await updateCategory(actor, input);
    revalidateTaxonomy();
    return { ok: true, id: category.id };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(id);
    const actor = await resolveActor();
    await deleteCategory(actor, { id: parsed });
    revalidateTaxonomy();
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

/* ───────────────────────── User support actions ───────────────────────── */

function revalidateUser(userId: string): void {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserRoleAction(
  userId: string,
  role: string,
): Promise<AdminActionResult> {
  try {
    const parsedId = idSchema.parse(userId);
    const parsedRole = roleSchema.parse(role);
    const actor = await resolveActor();
    await setUserRole(actor, { userId: parsedId, role: parsedRole });
    revalidateUser(parsedId);
    return { ok: true, id: parsedId };
  } catch (error) {
    return toError(error);
  }
}

export async function banUserAction(
  userId: string,
  reason: string,
  expiresInDays: number | null,
): Promise<AdminActionResult> {
  try {
    const parsedId = idSchema.parse(userId);
    const parsedReason = reasonSchema.parse(reason);
    const parsedDays = expiresInDaysSchema.parse(expiresInDays);
    const actor = await resolveActor();
    await banUser(actor, {
      userId: parsedId,
      reason: parsedReason,
      expiresInDays: parsedDays ?? null,
    });
    revalidateUser(parsedId);
    return { ok: true, id: parsedId };
  } catch (error) {
    return toError(error);
  }
}

export async function unbanUserAction(
  userId: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(userId);
    const actor = await resolveActor();
    await unbanUser(actor, { id: parsed });
    revalidateUser(parsed);
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

export async function markEmailVerifiedAction(
  userId: string,
  verified: boolean,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(userId);
    const actor = await resolveActor();
    await setEmailVerified(actor, { userId: parsed, verified });
    revalidateUser(parsed);
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

/** Re-send the verification link (support: mail never arrived). */
export async function resendVerificationAction(
  userId: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(userId);
    const actor = await resolveActor();
    const target = await getSupportTarget(actor, parsed);
    await auth.api.sendVerificationEmail({
      body: {
        email: target.email,
        callbackURL: "/verify-email?verified=1",
      },
      headers: await headers(),
    });
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

/** Send a single-use password reset link on the user's behalf. */
export async function sendPasswordResetAction(
  userId: string,
): Promise<AdminActionResult> {
  try {
    const parsed = idSchema.parse(userId);
    const actor = await resolveActor();
    const target = await getSupportTarget(actor, parsed);
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
    return { ok: true, id: parsed };
  } catch (error) {
    return toError(error);
  }
}

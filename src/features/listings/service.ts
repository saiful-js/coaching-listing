import {
  canArchive,
  canDelete,
  canEdit,
  canModerate,
  canSubmit,
  isTransitionAllowed,
} from "@/features/listings/policies";
import {
  createCoachingSchema,
  updateCoachingSchema,
} from "@/features/listings/schemas";
import { generateSlug } from "@/features/listings/slug";
import type { Coaching, ListingStatus } from "@/generated/prisma/client";
import {
  ForbiddenError,
  NotFoundError,
  requireOwnerOf,
  requireUser,
  type SessionResolver,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export interface Actor {
  id: string;
  role: "OWNER" | "ADMIN";
  emailVerified: boolean;
}

/** Max non-archived listings per owner (PRD A7). */
export const MAX_LISTINGS_PER_OWNER = 5;

export class RateLimitedError extends Error {
  readonly status = 429;
  constructor() {
    super("Too many attempts. Try again later.");
    this.name = "RateLimitedError";
  }
}

/**
 * Resolve the calling actor from the session. Server Actions call this and
 * pass the actor into the service functions below — the service itself never
 * touches `next/headers`, which keeps it testable.
 */
export async function resolveActor(resolver?: SessionResolver): Promise<Actor> {
  const user = await requireUser(resolver);
  return {
    id: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "OWNER",
    emailVerified: user.emailVerified,
  };
}

async function uniqueSlug(name: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug(name);
    const existing = await prisma.coaching.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not generate a unique URL. Try again.");
}

async function assertAreaAndCategories(areaId: string, categoryIds: string[]) {
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { id: true },
  });
  if (!area) {
    throw new Error("Unknown area. Pick one from the list.");
  }
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  if (categories.length !== categoryIds.length) {
    throw new Error("Unknown category. Pick from the list.");
  }
}

/**
 * Write a status transition plus its audit row atomically. THE only place
 * that writes `status` (PRD §5) — grep must show no other `status:` writes
 * on Coaching outside this function.
 */
async function transitionTo(
  actor: Actor,
  coachingId: string,
  to: ListingStatus,
  note?: string,
): Promise<Coaching> {
  const current = await prisma.coaching.findUnique({
    where: { id: coachingId },
  });
  if (!current) {
    throw new NotFoundError();
  }
  if (!isTransitionAllowed(current.status, to)) {
    throw new Error(`Cannot move a listing from ${current.status} to ${to}.`);
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.coaching.update({
      where: { id: coachingId },
      data: {
        status: to,
        publishedAt: to === "PUBLISHED" ? new Date() : current.publishedAt,
        rejectionReason: to === "REJECTED" ? (note ?? null) : null,
      },
    });
    await tx.listingAuditLog.create({
      data: {
        coachingId,
        actorId: actor.id,
        fromStatus: current.status,
        toStatus: to,
        note: note ?? null,
      },
    });
    return updated;
  });
}

export async function createCoaching(
  actor: Actor,
  input: unknown,
): Promise<Coaching> {
  const parsed = createCoachingSchema.parse(input);
  await assertAreaAndCategories(parsed.areaId, parsed.categoryIds);
  const active = await prisma.coaching.count({
    where: { ownerId: actor.id, status: { not: "ARCHIVED" } },
  });
  if (active >= MAX_LISTINGS_PER_OWNER) {
    throw new Error(
      `Listing limit reached (${MAX_LISTINGS_PER_OWNER} active listings).`,
    );
  }
  const budget = await consumeRateLimit({
    key: `listing-create:${actor.id}`,
    limit: 10,
    windowMs: 3_600_000,
  });
  if (!budget.allowed) {
    throw new RateLimitedError();
  }
  const slug = await uniqueSlug(parsed.name);
  return prisma.coaching.create({
    data: {
      slug,
      ownerId: actor.id,
      name: parsed.name,
      description: parsed.description,
      areaId: parsed.areaId,
      addressLine: parsed.addressLine,
      phone: parsed.phone,
      whatsapp: parsed.whatsapp ?? null,
      email: parsed.email ?? null,
      facebookUrl: parsed.facebookUrl ?? null,
      categories: { connect: parsed.categoryIds.map((id) => ({ id })) },
      status: "DRAFT",
    },
  });
}

export async function updateCoaching(
  actor: Actor,
  coachingId: string,
  input: unknown,
): Promise<Coaching> {
  const parsed = updateCoachingSchema.parse(input);
  const coaching =
    actor.role === "ADMIN"
      ? await prisma.coaching.findUnique({ where: { id: coachingId } })
      : await ownedCoachingOr404(actor, coachingId);
  if (!coaching) {
    throw new NotFoundError();
  }
  const isOwner = coaching.ownerId === actor.id;
  if (
    !canEdit(actor.role, isOwner || actor.role === "ADMIN", coaching.status)
  ) {
    throw new ForbiddenError();
  }
  await assertAreaAndCategories(parsed.areaId, parsed.categoryIds);
  return prisma.coaching.update({
    where: { id: coachingId },
    data: {
      name: parsed.name,
      description: parsed.description,
      areaId: parsed.areaId,
      addressLine: parsed.addressLine,
      phone: parsed.phone,
      whatsapp: parsed.whatsapp ?? null,
      email: parsed.email ?? null,
      facebookUrl: parsed.facebookUrl ?? null,
      categories: { set: parsed.categoryIds.map((id) => ({ id })) },
    },
  });
}

export async function submitForReview(
  actor: Actor,
  coachingId: string,
): Promise<Coaching> {
  const coaching = await ownedCoachingOr404(actor, coachingId);
  // Submit is owner-side: admins moderate via approve/reject, except for
  // their own drafts (an admin bypasses the ownership guard above, so
  // compare explicitly instead of trusting the guard).
  const isOwner = coaching.ownerId === actor.id;
  if (!isOwner) {
    throw new ForbiddenError();
  }
  if (!actor.emailVerified) {
    throw new Error("Verify your email before submitting a listing.");
  }
  if (!canSubmit(actor.role, isOwner, coaching.status)) {
    throw new Error(`Cannot submit a listing in ${coaching.status} status.`);
  }
  const cover = await prisma.coachingImage.findFirst({
    where: { coachingId, isCover: true },
    select: { id: true },
  });
  if (!cover) {
    throw new Error("Add a cover photo before submitting for review.");
  }
  return transitionTo(actor, coachingId, "PENDING");
}

export async function approveListing(
  actor: Actor,
  coachingId: string,
  note?: string,
): Promise<Coaching> {
  if (!canModerate(actor.role)) {
    throw new ForbiddenError();
  }
  return transitionTo(actor, coachingId, "PUBLISHED", note);
}

export async function rejectListing(
  actor: Actor,
  coachingId: string,
  reason: string,
): Promise<Coaching> {
  if (!canModerate(actor.role)) {
    throw new ForbiddenError();
  }
  if (!reason.trim()) {
    throw new Error("A rejection reason is required.");
  }
  return transitionTo(actor, coachingId, "REJECTED", reason.trim());
}

export async function archiveListing(
  actor: Actor,
  coachingId: string,
  note?: string,
): Promise<Coaching> {
  if (actor.role === "ADMIN") {
    const coaching = await prisma.coaching.findUnique({
      where: { id: coachingId },
    });
    if (!coaching) {
      throw new NotFoundError();
    }
    return transitionTo(actor, coachingId, "ARCHIVED", note);
  }
  const coaching = await ownedCoachingOr404(actor, coachingId);
  if (!canArchive(actor.role, true, coaching.status)) {
    throw new Error(`Cannot archive a listing in ${coaching.status} status.`);
  }
  return transitionTo(actor, coachingId, "ARCHIVED", note);
}

/**
 * Injected cloud cleanup for permanent deletion. Keep the listings service
 * free of uploads internals; the Server Action wires the real destroyer.
 */
export type ImageDestroyer = (keys: string[]) => Promise<void>;

/**
 * Permanently delete a listing (owner of their own, or any admin).
 * Irreversible: cascades image rows and the audit trail. Uploaded objects
 * are destroyed best-effort when a destroyer is supplied.
 */
export async function deleteCoaching(
  actor: Actor,
  coachingId: string,
  destroyImages?: ImageDestroyer,
): Promise<void> {
  const coaching =
    actor.role === "ADMIN"
      ? await prisma.coaching.findUnique({ where: { id: coachingId } })
      : await ownedCoachingOr404(actor, coachingId);
  if (!coaching) {
    throw new NotFoundError();
  }
  if (!canDelete(actor.role, coaching.ownerId === actor.id)) {
    throw new ForbiddenError();
  }
  const images = await prisma.coachingImage.findMany({
    where: { coachingId },
    select: { key: true },
  });
  if (destroyImages && images.length > 0) {
    await destroyImages(images.map((image) => image.key));
  }
  // Cascades image rows and audit logs (schema onDelete: Cascade).
  await prisma.coaching.delete({ where: { id: coachingId } });
}

/** Adapt an already-resolved actor to the guards' resolver seam. */
export function actorResolver(actor: Actor): SessionResolver {
  return async () => ({
    user: {
      id: actor.id,
      email: "",
      role: actor.role,
      emailVerified: actor.emailVerified,
    },
  });
}

/** Ownership guard (404-not-403) plus the full row for status decisions. */
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

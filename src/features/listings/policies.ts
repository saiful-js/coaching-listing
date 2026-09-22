import type { ListingStatus } from "@/generated/prisma/client";

export type Role = "OWNER" | "ADMIN";

/**
 * Listing lifecycle rules (PRD §5), pure and DB-free so the matrix is
 * unit-testable. The service enforces these AND ownership; this module
 * never touches the database.
 */
const ALLOWED_TRANSITIONS: ReadonlyMap<ListingStatus, ListingStatus[]> =
  new Map([
    ["DRAFT", ["PENDING", "ARCHIVED"]],
    ["REJECTED", ["PENDING"]],
    ["PENDING", ["PUBLISHED", "REJECTED"]],
    ["PUBLISHED", ["ARCHIVED"]],
    ["ARCHIVED", []],
  ]);

export function isTransitionAllowed(
  from: ListingStatus,
  to: ListingStatus,
): boolean {
  return ALLOWED_TRANSITIONS.get(from)?.includes(to) ?? false;
}

/** Owner-or-admin editing (ownership checked separately by the service). */
export function canEdit(
  role: Role,
  isOwner: boolean,
  status: ListingStatus,
): boolean {
  if (role === "ADMIN") {
    return true;
  }
  if (!isOwner) {
    return false;
  }
  return (
    status === "DRAFT" ||
    status === "REJECTED" ||
    status === "PENDING" ||
    status === "PUBLISHED"
  );
}

/** Submit for review / resubmit after rejection. */
export function canSubmit(
  role: Role,
  isOwner: boolean,
  status: ListingStatus,
): boolean {
  if (role === "ADMIN") {
    return false;
  }
  return (
    isOwner && (status === "DRAFT" || status === "REJECTED")
  );
}

/** Abandon a draft or take a published listing down (owner side). */
export function canArchive(
  role: Role,
  isOwner: boolean,
  status: ListingStatus,
): boolean {
  if (role === "ADMIN") {
    return true;
  }
  return isOwner && (status === "DRAFT" || status === "PUBLISHED");
}

/** Approve / reject / unpublish queue work. */
export function canModerate(role: Role): boolean {
  return role === "ADMIN";
}

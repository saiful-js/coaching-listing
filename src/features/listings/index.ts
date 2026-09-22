/**
 * Listings feature boundary (PRD §12: cross-feature calls go through index).
 *
 * SERVER-ONLY barrel: it re-exports the service (→ Prisma/pg), which can
 * never be bundled for the browser. Client Components must import the
 * Server Actions / schemas via direct paths (`./actions`, `./schemas`).
 */

export type { ActionResult } from "./actions";
export {
  archiveListingAction,
  createListingAction,
  submitListingAction,
  updateListingAction,
} from "./actions";
export {
  canArchive,
  canEdit,
  canModerate,
  canSubmit,
  isTransitionAllowed,
} from "./policies";
export type { Actor } from "./service";
export {
  approveListing,
  archiveListing,
  createCoaching,
  MAX_LISTINGS_PER_OWNER,
  RateLimitedError,
  rejectListing,
  resolveActor,
  submitForReview,
  updateCoaching,
} from "./service";
export {
  PAGE_SIZE,
  areasWithCounts,
  getAreaWithListings,
  getPublishedBySlug,
  latestPublished,
  listPublished,
} from "./queries";
export type { PublishedFilters } from "./queries";

/**
 * Listings feature boundary (PRD §12: cross-feature calls go through index).
 *
 * SERVER-ONLY barrel: it re-exports the service (→ Prisma/pg), which can
 * never be bundled for the browser. Client Components must import the
 * Server Actions / schemas via direct paths (`./actions`, `./schemas`).
 */

export type { ActionResult } from "./actions";
export { safeFacebookUrl } from "./facebook";export {
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
export type { PublishedFilters } from "./queries";
export {
  allCategories,
  areasWithCounts,
  getAreaWithListings,
  getPublishedBySlug,
  latestPublished,
  listPublished,
  PAGE_SIZE,
} from "./queries";
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

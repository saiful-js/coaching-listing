/**
 * Admin feature boundary (PRD §12: cross-feature calls go through index).
 * SERVER-ONLY barrel (reaches Prisma).
 */

export type { AdminActionResult } from "./actions";
export {
  approveListingAction,
  createAreaAction,
  createCategoryAction,
  rejectListingAction,
  unpublishListingAction,
} from "./actions";
export type { TaxonomyInput } from "./service";
export { createArea, createCategory } from "./service";

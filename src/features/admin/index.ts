/**
 * Admin feature boundary (PRD §12: cross-feature calls go through index).
 * SERVER-ONLY barrel (reaches Prisma + the auth server API).
 */

export type { AdminActionResult } from "./actions";
export {
  approveListingAction,
  banUserAction,
  createAreaAction,
  createCategoryAction,
  deleteAreaAction,
  deleteCategoryAction,
  markEmailVerifiedAction,
  rejectListingAction,
  resendVerificationAction,
  sendPasswordResetAction,
  setUserRoleAction,
  unbanUserAction,
  unpublishListingAction,
  updateAreaAction,
  updateCategoryAction,
} from "./actions";
export type { TaxonomyInput } from "./service";
export {
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
} from "./service";

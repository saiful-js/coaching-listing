/**
 * Uploads feature boundary (PRD §12: cross-feature calls go through index).
 *
 * SERVER-ONLY barrel: the service reaches Prisma and the Cloudinary secret.
 * Client Components must import `./actions` (Server Actions) directly.
 */

export type { UploadActionResult } from "./actions";
export {
  deleteImageAction,
  setCoverAction,
  uploadImageAction,
} from "./actions";
export { cloudinaryUrl } from "./cloudinary-client";
export {
  deleteCoachingImage,
  MAX_IMAGES_PER_LISTING,
  setCoverImage,
  uploadCoachingImage,
} from "./service";

/**
 * Client-safe upload limits.
 *
 * Deliberately free of server imports (no Prisma, no Cloudinary secret) so
 * the service, the uploader, and the create-listing photo picker all share
 * one source of truth. Client Components must NOT import
 * `@/features/uploads` (that barrel reaches the Cloudinary secret).
 */
export const MAX_IMAGES_PER_LISTING = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** `accept` attribute for file inputs. */
export const ALLOWED_IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

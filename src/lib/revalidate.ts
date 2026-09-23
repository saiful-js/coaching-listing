import { revalidatePath } from "next/cache";

/**
 * Invalidate the cached public listing surfaces.
 *
 * The home page (`/`) is statically rendered and refreshed at most every
 * 5 minutes (`revalidate = 300`), so without this a moderation or owner
 * action that changes what it shows stays stale for up to that long. The
 * directory, area and detail pages render on demand, so they need no help
 * today — but `revalidatePath("/")` is the single lever if they become
 * static later.
 *
 * Call this from any Server Action that can change *published* listing data:
 * approve / unpublish / delete, editing or archiving a published listing,
 * image changes, and taxonomy creates (home shows area/category chips).
 */
export function revalidatePublicListings(): void {
  revalidatePath("/");
}

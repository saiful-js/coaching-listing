import Image from "next/image";
import { cloudinaryUrl } from "@/features/uploads";
import { ImageActions } from "@/features/uploads/components/image-actions";

export interface GalleryImage {
  id: string;
  key: string;
  width: number;
  height: number;
  isCover: boolean;
}

/**
 * Owner gallery (server): cover badge, fixed-aspect thumbs via next/image,
 * per-photo actions. Public gallery lands in M5.
 */
export function ImageGallery({
  images,
}: {
  images: GalleryImage[];
}) {
  if (images.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No photos yet — the first upload becomes the cover automatically.
      </p>
    );
  }
  const sorted = [...images].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover),
  );
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {sorted.map((image) => (
        <li
          key={image.id}
          className="overflow-hidden rounded-sm border border-line bg-paper-raised"
        >
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={cloudinaryUrl(image.key, 800)}
              alt={image.isCover ? "Cover photo" : "Listing photo"}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            {image.isCover ? (
              <span className="inline-flex h-6 items-center rounded-sm border border-forest bg-forest-tint px-2 font-mono text-xs text-forest">
                Cover
              </span>
            ) : (
              <span className="font-mono text-xs text-ink-faint">
                {image.width}×{image.height}
              </span>
            )}
            <ImageActions imageId={image.id} isCover={image.isCover} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CoverThumb({
  imageKey,
  name,
}: {
  imageKey: string;
  name: string;
}) {
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-sm border border-line">
      <Image src={cloudinaryUrl(imageKey, 200)} alt="" fill sizes="64px" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

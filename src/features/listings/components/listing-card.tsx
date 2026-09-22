import Image from "next/image";
import Link from "next/link";
import type { listPublished } from "@/features/listings";
import { cloudinaryUrl } from "@/features/uploads";

export type ListingCardItem = Awaited<
  ReturnType<typeof listPublished>
>["items"][number];

/**
 * Public listing card (server): cover, name, area, excerpt. Links to the
 * detail page. User-entered text uses the Bengali-capable content face.
 */
export function ListingCard({ item }: { item: ListingCardItem }) {
  const cover = item.images[0];
  return (
    <Link
      href={`/coachings/${item.slug}`}
      className="group overflow-hidden rounded-sm border border-line bg-paper-raised transition-colors hover:border-ink-soft"
    >
      <div className="relative aspect-[16/10] w-full bg-forest-mist">
        {cover ? (
          <Image
            src={cloudinaryUrl(cover.key, 600)}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center font-display text-4xl text-forest"
          >
            {item.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="grid gap-1 p-4">
        <p className="font-display text-lg leading-snug font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
          <span className="font-content">{item.name}</span>
        </p>
        <p className="font-mono text-xs text-ink-faint">
          <span className="font-content">{item.area.nameEn}</span>
        </p>
        <p className="font-content mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">
          {item.description}
        </p>
        <span className="sr-only">View details</span>
      </div>
    </Link>
  );
}

import Image from "next/image";
import { safeFacebookUrl } from "@/features/listings/facebook";
import { cloudinaryUrl } from "@/features/uploads";

/**
 * Public listing body. Extracted so the owner preview renders exactly what
 * the public page renders (same cover, gallery, contact actions) instead of
 * a hand-rolled lookalike that could drift.
 */
export interface ListingDetailData {
  name: string;
  addressLine: string;
  description: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  facebookUrl: string | null;
  area: { nameEn: string; nameBn: string };
  categories: { slug: string; nameEn: string; nameBn: string }[];
  images: {
    id: string;
    key: string;
    width: number;
    height: number;
    isCover: boolean;
  }[];
}

export function ListingDetail({ listing }: { listing: ListingDetailData }) {
  const whatsappDigits = listing.whatsapp?.replace(/\D/g, "");
  // Render-time scheme/host guard (stored-XSS defense in depth).
  const facebookHref = safeFacebookUrl(listing.facebookUrl);
  const [cover, ...gallery] = listing.images;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="eyebrow">
          <span className="font-content">{listing.area.nameEn}</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          <span className="font-content">{listing.name}</span>
        </h1>
        <p className="font-content mt-3 text-ink-soft">{listing.addressLine}</p>

        {cover && (
          <div className="mt-8 grid gap-4">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-line">
              <Image
                src={cloudinaryUrl(cover.key, 1200)}
                alt={`${listing.name} — cover photo`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
            </div>
            {gallery.length > 0 && (
              <ul className="grid grid-cols-3 gap-4">
                {gallery.slice(0, 3).map((image) => (
                  <li
                    key={image.id}
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line"
                  >
                    <Image
                      src={cloudinaryUrl(image.key, 600)}
                      alt={`${listing.name} — photo`}
                      fill
                      sizes="(max-width: 1024px) 33vw, 20vw"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <h2 className="mt-10 font-display text-xl font-medium tracking-tight">
          About
        </h2>
        <p className="font-content mt-3 leading-8 whitespace-pre-line text-ink">
          {listing.description}
        </p>

        <h2 className="mt-8 font-display text-xl font-medium tracking-tight">
          Classes &amp; subjects
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {listing.categories.map((category) => (
            <li
              key={category.slug}
              className="inline-flex h-9 items-center rounded-full border border-line bg-paper-raised px-4 text-sm text-ink-soft"
            >
              <span className="font-content">{category.nameEn}</span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:pt-2">
        <div className="grid gap-3 rounded-sm border border-line bg-paper-raised p-5 lg:sticky lg:top-20">
          <h2 className="font-display text-lg font-medium">Contact</h2>
          <a href={`tel:${listing.phone}`} className="btn btn-primary">
            Call {listing.phone}
          </a>
          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              WhatsApp
            </a>
          )}
          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="break-all text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              {listing.email}
            </a>
          )}
          {facebookHref && (
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Facebook page
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

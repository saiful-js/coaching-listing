import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingDetail } from "@/features/listings/components/listing-detail";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Preview listing",
  description: "See your listing as visitors will.",
};

/**
 * Owner preview: renders the *same* component as the public page, for any
 * status, so owners can check their listing (and a rejection fix) before it
 * is publicly visible.
 */
export default async function PreviewListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const listing = await prisma.coaching.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      ownerId: true,
      status: true,
      name: true,
      addressLine: true,
      description: true,
      phone: true,
      whatsapp: true,
      email: true,
      facebookUrl: true,
      area: { select: { nameEn: true, nameBn: true } },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { slug: true, nameEn: true, nameBn: true },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          key: true,
          width: true,
          height: true,
          isCover: true,
        },
      },
    },
  });
  // 404-not-403: another owner's listing is indistinguishable from missing.
  if (!listing || (user.role !== "ADMIN" && listing.ownerId !== user.id)) {
    notFound();
  }
  const isLive = listing.status === "PUBLISHED";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          ← Back to my listings
        </Link>
        {listing.status !== "ARCHIVED" && (
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="btn btn-secondary h-9 px-4 text-[13px]"
          >
            Edit listing
          </Link>
        )}
      </div>

      <output className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-line bg-paper-raised p-3 text-sm text-ink-soft">
        <StatusBadge status={listing.status} />
        <span>
          {isLive
            ? "This is your live public page."
            : "Preview only — this listing is not visible to the public yet."}
        </span>
        {isLive && (
          <Link
            href={`/coachings/${listing.slug}`}
            className="underline underline-offset-4 hover:text-ink"
          >
            Open the public page →
          </Link>
        )}
      </output>

      <ListingDetail listing={listing} />
    </div>
  );
}

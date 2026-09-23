import Link from "next/link";
import { MAX_LISTINGS_PER_OWNER } from "@/features/listings";
import { DashboardActions } from "@/features/listings/components/dashboard-actions";
import { DeleteListingButton } from "@/features/listings/components/delete-listing-button";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { CoverThumb } from "@/features/uploads/components/image-gallery";
import type { ListingStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
  description: "Manage your coaching listings.",
};

const SUMMARY: { status: ListingStatus; label: string }[] = [
  { status: "PUBLISHED", label: "Published" },
  { status: "PENDING", label: "In review" },
  { status: "DRAFT", label: "Draft" },
  { status: "REJECTED", label: "Needs changes" },
  { status: "ARCHIVED", label: "Archived" },
];

/** What the owner should do next, given the listing's state. */
function nextStep(status: ListingStatus, imageCount: number): string {
  switch (status) {
    case "DRAFT":
      return imageCount === 0
        ? "Add at least one photo, then submit for review."
        : "Ready — submit it for review.";
    case "PENDING":
      return "In review. We'll email you when it's decided.";
    case "PUBLISHED":
      return "Live. Edits you save go out immediately.";
    case "REJECTED":
      return "Fix the reviewer's note, then submit again.";
    case "ARCHIVED":
      return "Archived — not visible to the public.";
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const listings = await prisma.coaching.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      rejectionReason: true,
      updatedAt: true,
      area: { select: { nameEn: true } },
      images: {
        where: { isCover: true },
        take: 1,
        select: { key: true },
      },
      _count: { select: { images: true } },
    },
  });

  const countBy = new Map<ListingStatus, number>();
  for (const listing of listings) {
    countBy.set(listing.status, (countBy.get(listing.status) ?? 0) + 1);
  }
  const activeCount = listings.filter((l) => l.status !== "ARCHIVED").length;
  const atCap = activeCount >= MAX_LISTINGS_PER_OWNER;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          My listings
        </h1>
        {atCap ? (
          <span
            aria-disabled="true"
            className="btn btn-secondary cursor-not-allowed opacity-60"
          >
            New listing
          </span>
        ) : (
          <Link href="/dashboard/listings/new" className="btn btn-primary">
            New listing
          </Link>
        )}
      </div>

      {!user.emailVerified && (
        <output className="block rounded-sm border border-clay bg-clay-tint p-3 text-sm text-ink">
          Your email isn&apos;t verified yet — you can draft a listing, but not
          submit it for review.{" "}
          <Link
            href="/dashboard/account"
            className="underline underline-offset-4"
          >
            Verify your email
          </Link>
          .
        </output>
      )}

      {listings.length > 0 && (
        <div className="grid gap-3 rounded-sm border border-line bg-paper-raised p-4 sm:flex sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {SUMMARY.map(({ status, label }) => (
              <li key={status} className="text-sm">
                <span className="font-display text-xl font-medium tabular-nums">
                  {countBy.get(status) ?? 0}
                </span>{" "}
                <span className="text-ink-soft">{label}</span>
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-ink-faint">
            {activeCount} of {MAX_LISTINGS_PER_OWNER} active listings
          </p>
        </div>
      )}

      {atCap && (
        <p className="text-sm text-ink-soft">
          You&apos;ve reached the {MAX_LISTINGS_PER_OWNER}-listing limit. Delete
          a listing to free a slot.
        </p>
      )}

      {listings.length === 0 ? (
        <div className="rounded-sm border border-line bg-paper-raised p-8 text-center">
          <p className="font-display text-xl">No listings yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first listing — it goes live after a quick review.
          </p>
          <Link href="/dashboard/listings/new" className="btn btn-primary mt-6">
            Create listing
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="rounded-sm border border-line bg-paper-raised p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {listing.images[0] && (
                    <CoverThumb
                      imageKey={listing.images[0].key}
                      name={listing.name}
                    />
                  )}
                  <div className="grid gap-1">
                    <p className="font-display text-lg font-medium">
                      <span className="font-content">{listing.name}</span>
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {listing.area.nameEn} · updated{" "}
                      {listing.updatedAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={listing.status} />
              </div>

              <p className="mt-3 text-sm text-ink-soft">
                {nextStep(listing.status, listing._count.images)}
              </p>

              {listing.status === "REJECTED" && listing.rejectionReason && (
                <p
                  role="note"
                  className="mt-3 rounded-sm border border-clay bg-clay-tint p-3 text-sm text-ink"
                >
                  Reviewer note: {listing.rejectionReason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {listing.status !== "ARCHIVED" && (
                  <Link
                    href={`/dashboard/listings/${listing.id}/preview`}
                    className="btn btn-secondary h-9 px-4 text-[13px]"
                  >
                    Preview
                  </Link>
                )}
                {listing.status === "PUBLISHED" && (
                  <Link
                    href={`/coachings/${listing.slug}`}
                    className="btn btn-secondary h-9 px-4 text-[13px]"
                  >
                    View live
                  </Link>
                )}
                {listing.status !== "ARCHIVED" && (
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="btn btn-secondary h-9 px-4 text-[13px]"
                  >
                    Edit
                  </Link>
                )}
                <DashboardActions id={listing.id} status={listing.status} />
                <DeleteListingButton id={listing.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

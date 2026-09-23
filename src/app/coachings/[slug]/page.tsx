import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBySlug } from "@/features/listings";
import { ListingDetail } from "@/features/listings/components/listing-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getPublishedBySlug(slug);
  if (!listing) {
    return { title: "Not found" };
  }
  return {
    title: `${listing.name} — ${listing.area.nameEn}`,
    description: listing.description.slice(0, 160),
  };
}

export default async function CoachingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getPublishedBySlug(slug);
  if (!listing) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/coachings"
        className="font-mono text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        ← All coaching centres
      </Link>
      <div className="mt-6">
        <ListingDetail listing={listing} />
      </div>
    </div>
  );
}

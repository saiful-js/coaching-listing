import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaWithListings } from "@/features/listings";
import { ListingCard } from "@/features/listings/components/listing-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = await getAreaWithListings(slug);
  if (!landing) {
    return { title: "Area not found" };
  }
  return {
    title: `Coaching centres in ${landing.area.nameEn}`,
    description: `Find reviewed coaching centres in ${landing.area.nameEn}, Narayanganj — addresses, phone and WhatsApp on every listing.`,
  };
}

/**
 * Area landing page (main organic-traffic surface): unique title per area
 * plus its published listings.
 */
export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = await getAreaWithListings(slug);
  if (!landing) {
    notFound();
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Narayanganj · Areas</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        Coaching centres in{" "}
        <span className="font-content">{landing.area.nameEn}</span>
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-soft">
        Every centre below was reviewed before going live — browse addresses,
        photos, and contact details for{" "}
        <span className="font-content">{landing.area.nameEn}</span>.
      </p>

      {landing.items.length === 0 ? (
        <div className="mt-8 rounded-sm border border-line bg-paper-raised p-8 text-center">
          <h2 className="font-display text-xl font-medium tracking-tight">
            No listings here yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
            Centres in this area are still signing up. Browse the full
            directory meanwhile.
          </p>
          <Link href="/coachings" className="btn btn-secondary mt-6">
            Browse all centres
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {landing.items.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </ul>
          {landing.total > landing.items.length && (
            <div className="mt-8 text-center">
              <Link
                href={`/coachings?area=${landing.area.slug}`}
                className="btn btn-secondary"
              >
                See all {landing.total} in {landing.area.nameEn}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

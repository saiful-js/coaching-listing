import { ListingForm } from "@/features/listings/components/listing-form";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "New listing",
  description: "Create a coaching listing for review.",
};

export default async function NewListingPage() {
  const [areas, categories] = await Promise.all([
    prisma.area.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, nameBn: true },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, nameBn: true },
    }),
  ]);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          New listing
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Saved as a draft first — add photos now or later, then submit it for
          review.
        </p>
      </div>
      <ListingForm mode="create" areas={areas} categories={categories} />
    </div>
  );
}

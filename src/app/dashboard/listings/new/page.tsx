import { redirect } from "next/navigation";
import { ListingForm } from "@/features/listings/components/listing-form";
import { requireUser, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "New listing",
  description: "Create a coaching listing for review.",
};

export default async function NewListingPage() {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Owner dashboard</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        New listing
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Saved as a draft first — submit it for review when ready.
      </p>
      <div className="mt-6">
        <ListingForm mode="create" areas={areas} categories={categories} />
      </div>
    </div>
  );
}

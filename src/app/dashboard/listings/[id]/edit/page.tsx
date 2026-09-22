import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/features/listings/components/listing-form";
import { requireUser, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Edit listing",
  description: "Edit your coaching listing.",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let userId: string;
  let role: "OWNER" | "ADMIN";
  try {
    ({ id: userId, role } = await requireUser());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
  // 404-not-403: a missing id and another owner's id look identical.
  const listing = await prisma.coaching.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      name: true,
      areaId: true,
      addressLine: true,
      description: true,
      phone: true,
      whatsapp: true,
      email: true,
      facebookUrl: true,
      categories: { select: { id: true } },
    },
  });
  if (!listing || (role !== "ADMIN" && listing.ownerId !== userId)) {
    notFound();
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
        Edit listing
      </h1>
      <div className="mt-6">
        <ListingForm
          mode="edit"
          listingId={listing.id}
          initial={{
            name: listing.name,
            areaId: listing.areaId,
            addressLine: listing.addressLine,
            description: listing.description,
            categoryIds: listing.categories.map((c) => c.id),
            phone: listing.phone,
            whatsapp: listing.whatsapp ?? undefined,
            email: listing.email ?? undefined,
            facebookUrl: listing.facebookUrl ?? undefined,
          }}
          areas={areas}
          categories={categories}
        />
      </div>
    </div>
  );
}

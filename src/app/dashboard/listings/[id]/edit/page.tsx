import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/features/listings/components/listing-form";
import { ImageGallery } from "@/features/uploads/components/image-gallery";
import { ImageUploader } from "@/features/uploads/components/image-uploader";
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
      status: true,
      areaId: true,
      addressLine: true,
      description: true,
      phone: true,
      whatsapp: true,
      email: true,
      facebookUrl: true,
      categories: { select: { id: true } },
      images: {
        orderBy: { sortOrder: "asc" },
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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Edit listing
        </h1>
        {listing.status !== "ARCHIVED" && (
          <Link
            href={`/dashboard/listings/${listing.id}/preview`}
            className="btn btn-secondary h-9 px-4 text-[13px]"
          >
            Preview
          </Link>
        )}
      </div>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        status={listing.status}
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
      <div className="mt-4 grid gap-4 border-t border-line pt-8">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">
            Photos
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            The cover photo is what people see in search results. You need at
            least one photo before submitting for review.
          </p>
        </div>
        <ImageUploader
          coachingId={listing.id}
          imageCount={listing.images.length}
        />
        <ImageGallery images={listing.images} />
      </div>
    </div>
  );
}

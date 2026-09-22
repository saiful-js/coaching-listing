import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardActions } from "@/features/listings/components/dashboard-actions";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { requireUser, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
  description: "Manage your coaching listings.",
};

export default async function DashboardPage() {
  let userId: string;
  try {
    ({ id: userId } = await requireUser());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
  const listings = await prisma.coaching.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      rejectionReason: true,
      updatedAt: true,
      area: { select: { nameEn: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
            My listings
          </h1>
        </div>
        <Link href="/dashboard/listings/new" className="btn btn-primary">
          New listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-8 rounded-sm border border-line bg-paper-raised p-8 text-center">
          <p className="font-display text-xl">No listings yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first listing — it goes live after a quick review.
          </p>
          <Link href="/dashboard/listings/new" className="btn btn-primary mt-6">
            Create listing
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="rounded-sm border border-line bg-paper-raised p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="font-display text-lg font-medium">
                    {listing.name}
                  </p>
                  <p className="font-mono text-xs text-ink-faint">
                    {listing.area.nameEn} · updated{" "}
                    {listing.updatedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <StatusBadge status={listing.status} />
              </div>
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
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="btn btn-secondary h-9 px-4 text-[13px]"
                  >
                    Edit
                  </Link>
                )}
                <DashboardActions id={listing.id} status={listing.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

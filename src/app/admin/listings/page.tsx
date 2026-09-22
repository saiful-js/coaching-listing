import Link from "next/link";
import { ModerationActions } from "@/features/admin/components/moderation-actions";
import { StatusBadge } from "@/features/listings/components/status-badge";
import type { ListingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Review queue",
  description: "Moderate coaching listings.",
};

const TABS: { value: string; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "", label: "All" },
];

const STATUSES: ListingStatus[] = [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  // Missing/unknown → PENDING queue; explicit empty → all statuses.
  const status: ListingStatus | "ALL" =
    raw === ""
      ? "ALL"
      : (STATUSES as string[]).includes(raw ?? "")
        ? (raw as ListingStatus)
        : "PENDING";

  const [counts, listings] = await Promise.all([
    prisma.coaching.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.coaching.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        owner: { select: { email: true } },
        area: { select: { nameEn: true } },
      },
    }),
  ]);
  const countBy = new Map(counts.map((c) => [c.status, c._count._all]));

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Review queue
      </h1>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by status"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.value || "all"}
            href={
              tab.value
                ? `/admin/listings?status=${tab.value}`
                : "/admin/listings?status="
            }
            role="tab"
            aria-selected={
              tab.value === status || (tab.value === "" && status === "ALL")
            }
            className={`inline-flex h-9 items-center rounded-sm border px-4 font-mono text-xs ${
              tab.value === status || (tab.value === "" && status === "ALL")
                ? "border-forest bg-forest text-paper"
                : "border-line-strong bg-paper-raised text-ink-soft hover:border-ink-soft"
            }`}
          >
            {tab.label} (
            {tab.value
              ? (countBy.get(tab.value as ListingStatus) ?? 0)
              : counts.reduce((n, c) => n + c._count._all, 0)}
            )
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-sm border border-line bg-paper-raised p-8 text-center text-sm text-ink-soft">
          Nothing with this status. The queue is clear.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="grid gap-3 rounded-sm border border-line bg-paper-raised p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="font-display text-lg font-medium">
                    <span className="font-content">{listing.name}</span>
                  </p>
                  <p className="font-mono text-xs text-ink-faint">
                    {listing.owner.email} · {listing.area.nameEn} · updated{" "}
                    {listing.updatedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <StatusBadge status={listing.status} />
              </div>
              {(listing.status === "PENDING" ||
                listing.status === "PUBLISHED") && (
                <ModerationActions id={listing.id} status={listing.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

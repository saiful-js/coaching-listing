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
  { value: "DRAFT", label: "Drafts" },
  { value: "", label: "All" },
];

const STATUSES: ListingStatus[] = [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
];

const QUEUE_PAGE_SIZE = 25;

function tabHref(value: string): string {
  return value ? `/admin/listings?status=${value}` : "/admin/listings?status=";
}

function pageHref(status: ListingStatus | "ALL", page: number): string {
  const base = status === "ALL" ? "/admin/listings?status=" : tabHref(status);
  return `${base}&page=${page}`;
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  // Missing/unknown → PENDING queue; explicit empty → all statuses.
  const status: ListingStatus | "ALL" =
    rawStatus === ""
      ? "ALL"
      : (STATUSES as string[]).includes(rawStatus ?? "")
        ? (rawStatus as ListingStatus)
        : "PENDING";
  const parsedPage = Number.parseInt(rawPage ?? "", 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const where = status === "ALL" ? {} : { status };
  const [counts, total, listings] = await Promise.all([
    prisma.coaching.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.coaching.count({ where }),
    prisma.coaching.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * QUEUE_PAGE_SIZE,
      take: QUEUE_PAGE_SIZE,
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
  const pages = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE));

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
            href={tabHref(tab.value)}
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
        <>
          <p
            className="mt-4 font-mono text-xs text-ink-faint"
            aria-live="polite"
          >
            Showing {(page - 1) * QUEUE_PAGE_SIZE + 1}–
            {(page - 1) * QUEUE_PAGE_SIZE + listings.length} of {total}
          </p>
          <ul className="mt-4 grid gap-4">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="grid gap-3 rounded-sm border border-line bg-paper-raised p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="font-display text-lg font-medium hover:underline hover:underline-offset-4"
                    >
                      <span className="font-content">{listing.name}</span>
                    </Link>
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
          {pages > 1 && (
            <nav
              aria-label="Queue pagination"
              className="mt-8 flex items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link
                  href={pageHref(status, page - 1)}
                  className="btn btn-secondary h-10 px-4 text-sm"
                >
                  ← Previous
                </Link>
              )}
              <span className="font-mono text-xs text-ink-faint">
                {page} / {pages}
              </span>
              {page < pages && (
                <Link
                  href={pageHref(status, page + 1)}
                  className="btn btn-secondary h-10 px-4 text-sm"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

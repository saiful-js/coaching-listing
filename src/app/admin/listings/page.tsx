import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/listings/components/status-badge";
import type { ListingStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Listings",
  description: "Search, filter, and moderate every listing.",
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

const PAGE_SIZE = 25;

interface Filters {
  status: ListingStatus | "ALL";
  q?: string;
  area?: string;
  page: number;
}

function buildHref(filters: Partial<Filters>): string {
  const search = new URLSearchParams();
  const status = filters.status ?? "PENDING";
  search.set("status", status === "ALL" ? "" : status);
  if (filters.q) {
    search.set("q", filters.q);
  }
  if (filters.area) {
    search.set("area", filters.area);
  }
  if (filters.page && filters.page > 1) {
    search.set("page", String(filters.page));
  }
  return `/admin/listings?${search.toString()}`;
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

  const rawStatus = first(params.status);
  const status: ListingStatus | "ALL" =
    rawStatus === ""
      ? "ALL"
      : (STATUSES as string[]).includes(rawStatus)
        ? (rawStatus as ListingStatus)
        : "PENDING";
  const q = first(params.q).trim();
  const area = first(params.area).trim();
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const where: Prisma.CoachingWhereInput = {
    ...(status === "ALL" ? {} : { status }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(area ? { area: { slug: area } } : {}),
  };

  const [counts, total, listings, areas] = await Promise.all([
    prisma.coaching.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.coaching.count({ where }),
    prisma.coaching.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        owner: { select: { email: true } },
        area: { select: { nameEn: true } },
      },
    }),
    prisma.area.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, nameEn: true },
    }),
  ]);

  const countBy = new Map(counts.map((c) => [c.status, c._count._all]));
  const totalAll = counts.reduce((n, c) => n + c._count._all, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp the high end so a stale ?page= link shows page 1's neighbours.
  const shownPage = Math.min(page, pages);
  const hasFilters = Boolean(q || area);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Listings"
        description="Search by listing name or owner email, filter by area, then open one to moderate."
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by status"
      >
        {TABS.map((tab) => {
          const value = tab.value as ListingStatus | "ALL" | "";
          const isActive = value === "" ? status === "ALL" : value === status;
          return (
            <Link
              key={tab.value || "all"}
              href={buildHref({
                status: tab.value === "" ? "ALL" : (tab.value as ListingStatus),
                q,
                area,
              })}
              role="tab"
              aria-selected={isActive}
              className={`inline-flex h-9 items-center rounded-sm border px-4 font-mono text-xs ${
                isActive
                  ? "border-forest bg-forest text-paper"
                  : "border-line-strong bg-paper-raised text-ink-soft hover:border-ink-soft"
              }`}
            >
              {tab.label} (
              {tab.value
                ? (countBy.get(tab.value as ListingStatus) ?? 0)
                : totalAll}
              )
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action="/admin/listings"
        className="grid gap-3 rounded-sm border border-line bg-paper-raised p-4 sm:grid-cols-[1fr_200px_auto_auto] sm:items-end"
      >
        <input
          type="hidden"
          name="status"
          value={status === "ALL" ? "" : status}
        />
        <div className="grid gap-1.5">
          <label htmlFor="admin-q" className="text-sm font-medium text-ink">
            Search
          </label>
          <input
            id="admin-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Listing name or owner email…"
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="admin-area" className="text-sm font-medium text-ink">
            Area
          </label>
          <select
            id="admin-area"
            name="area"
            defaultValue={area}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.nameEn}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary h-11">
          Filter
        </button>
        {hasFilters && (
          <Link
            href={buildHref({ status })}
            className="btn btn-secondary h-11 px-4 text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="font-mono text-xs text-ink-faint" aria-live="polite">
        {total} {total === 1 ? "listing" : "listings"} · page {shownPage} of{" "}
        {pages}
      </p>

      {listings.length === 0 ? (
        <p className="rounded-sm border border-line bg-paper-raised p-8 text-center text-sm text-ink-soft">
          {hasFilters
            ? "Nothing matches those filters."
            : "Nothing with this status. The queue is clear."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-forest-mist text-left font-mono text-xs tracking-wide text-ink-faint uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="font-content font-medium underline-offset-4 hover:underline"
                    >
                      {listing.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {listing.owner.email}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {listing.area.nameEn}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-faint">
                    {listing.updatedAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="btn btn-secondary h-8 px-3 text-xs"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          aria-label="Listings pagination"
          className="flex items-center justify-center gap-2"
        >
          {shownPage > 1 && (
            <Link
              href={buildHref({ status, q, area, page: shownPage - 1 })}
              className="btn btn-secondary h-10 px-4 text-sm"
            >
              ← Previous
            </Link>
          )}
          <span className="font-mono text-xs text-ink-faint">
            {shownPage} / {pages}
          </span>
          {shownPage < pages && (
            <Link
              href={buildHref({ status, q, area, page: shownPage + 1 })}
              className="btn btn-secondary h-10 px-4 text-sm"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

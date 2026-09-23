import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import type { ListingStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Activity",
  description: "Every listing status change, most recent first.",
};

const PAGE_SIZE = 30;

const STATUSES: ListingStatus[] = [
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
  "DRAFT",
];

interface Filters {
  q?: string;
  status?: ListingStatus;
  page: number;
}

function buildHref(filters: Partial<Filters>): string {
  const search = new URLSearchParams();
  if (filters.q) {
    search.set("q", filters.q);
  }
  if (filters.status) {
    search.set("status", filters.status);
  }
  if (filters.page && filters.page > 1) {
    search.set("page", String(filters.page));
  }
  const query = search.toString();
  return query ? `/admin/activity?${query}` : "/admin/activity";
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

  const q = first(params.q).trim();
  const rawStatus = first(params.status);
  const status = (STATUSES as string[]).includes(rawStatus)
    ? (rawStatus as ListingStatus)
    : undefined;
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const where: Prisma.ListingAuditLogWhereInput = {
    ...(status ? { toStatus: status } : {}),
    ...(q ? { coaching: { name: { contains: q, mode: "insensitive" } } } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.listingAuditLog.count({ where }),
    prisma.listingAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        note: true,
        createdAt: true,
        actorId: true,
        coaching: { select: { id: true, name: true } },
      },
    }),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, role: true },
  });
  const actorById = new Map(actors.map((a) => [a.id, a]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownPage = Math.min(page, pages);
  const hasFilters = Boolean(q || status);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Activity"
        description="Who changed which listing, and when. Every status transition is recorded here."
      />

      <form
        method="get"
        action="/admin/activity"
        className="grid gap-3 rounded-sm border border-line bg-paper-raised p-4 sm:grid-cols-[1fr_190px_auto_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <label htmlFor="activity-q" className="text-sm font-medium text-ink">
            Listing name
          </label>
          <input
            id="activity-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by listing name…"
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="grid gap-1.5">
          <label
            htmlFor="activity-status"
            className="text-sm font-medium text-ink"
          >
            New status
          </label>
          <select
            id="activity-status"
            name="status"
            defaultValue={status ?? ""}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="">Any status</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary h-11">
          Filter
        </button>
        {hasFilters && (
          <Link
            href="/admin/activity"
            className="btn btn-secondary h-11 px-4 text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="font-mono text-xs text-ink-faint" aria-live="polite">
        {total} {total === 1 ? "event" : "events"} · page {shownPage} of {pages}
      </p>

      {logs.length === 0 ? (
        <p className="rounded-sm border border-line bg-paper-raised p-8 text-center text-sm text-ink-soft">
          No activity matches those filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-forest-mist text-left font-mono text-xs tracking-wide text-ink-faint uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Transition</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actor = actorById.get(log.actorId);
                return (
                  <tr key={log.id} className="border-t border-line">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-faint">
                      {log.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/listings/${log.coaching.id}`}
                        className="font-content font-medium underline-offset-4 hover:underline"
                      >
                        {log.coaching.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {actor ? (
                        <>
                          {actor.email}
                          <span className="ml-1 font-mono text-xs text-ink-faint">
                            ({actor.role})
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-xs">{log.actorId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-soft">
                      {log.fromStatus} → {log.toStatus}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-ink-soft">
                      {log.note ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          aria-label="Activity pagination"
          className="flex items-center justify-center gap-2"
        >
          {shownPage > 1 && (
            <Link
              href={buildHref({ q, status, page: shownPage - 1 })}
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
              href={buildHref({ q, status, page: shownPage + 1 })}
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

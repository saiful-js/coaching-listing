import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Users",
  description: "Find owners and admins, and open an account to help.",
};

const PAGE_SIZE = 25;

interface Filters {
  q?: string;
  role?: "ADMIN" | "OWNER";
  state?: "banned" | "unverified";
  page: number;
}

function buildHref(filters: Partial<Filters>): string {
  const search = new URLSearchParams();
  if (filters.q) {
    search.set("q", filters.q);
  }
  if (filters.role) {
    search.set("role", filters.role);
  }
  if (filters.state) {
    search.set("state", filters.state);
  }
  if (filters.page && filters.page > 1) {
    search.set("page", String(filters.page));
  }
  const query = search.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

const STATE_TABS: { value: "" | "unverified" | "banned"; label: string }[] = [
  { value: "", label: "All" },
  { value: "unverified", label: "Unverified" },
  { value: "banned", label: "Suspended" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

  const q = first(params.q).trim();
  const rawRole = first(params.role);
  const role = rawRole === "ADMIN" || rawRole === "OWNER" ? rawRole : undefined;
  const rawState = first(params.state);
  const state =
    rawState === "banned" || rawState === "unverified" ? rawState : undefined;
  const parsedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(state === "banned" ? { banned: true } : {}),
    ...(state === "unverified" ? { emailVerified: false } : {}),
  };

  const [total, users, bannedCount, unverifiedCount, allCount] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          banned: true,
          createdAt: true,
          _count: { select: { coachings: true } },
        },
      }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { emailVerified: false } }),
      prisma.user.count(),
    ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownPage = Math.min(page, pages);
  const hasFilters = Boolean(q || role || state);
  const counts: Record<string, number> = {
    "": allCount,
    unverified: unverifiedCount,
    banned: bannedCount,
  };

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Users"
        description="Every owner and admin account. Open an account to verify emails, send reset links, change roles, or suspend it."
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by account state"
      >
        {STATE_TABS.map((tab) => {
          const isActive = (state ?? "") === tab.value;
          return (
            <Link
              key={tab.value || "all"}
              href={buildHref({ q, role, state: tab.value || undefined })}
              role="tab"
              aria-selected={isActive}
              className={`inline-flex h-9 items-center rounded-sm border px-4 font-mono text-xs ${
                isActive
                  ? "border-forest bg-forest text-paper"
                  : "border-line-strong bg-paper-raised text-ink-soft hover:border-ink-soft"
              }`}
            >
              {tab.label} ({counts[tab.value] ?? 0})
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action="/admin/users"
        className="grid gap-3 rounded-sm border border-line bg-paper-raised p-4 sm:grid-cols-[1fr_170px_auto_auto] sm:items-end"
      >
        {state && <input type="hidden" name="state" value={state} />}
        <div className="grid gap-1.5">
          <label htmlFor="users-q" className="text-sm font-medium text-ink">
            Search
          </label>
          <input
            id="users-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email…"
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="users-role" className="text-sm font-medium text-ink">
            Role
          </label>
          <select
            id="users-role"
            name="role"
            defaultValue={role ?? ""}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="">All roles</option>
            <option value="OWNER">Owners</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary h-11">
          Filter
        </button>
        {hasFilters && (
          <Link
            href="/admin/users"
            className="btn btn-secondary h-11 px-4 text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="font-mono text-xs text-ink-faint" aria-live="polite">
        {total} {total === 1 ? "account" : "accounts"} · page {shownPage} of{" "}
        {pages}
      </p>

      {users.length === 0 ? (
        <p className="rounded-sm border border-line bg-paper-raised p-8 text-center text-sm text-ink-soft">
          No accounts match those filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-forest-mist text-left font-mono text-xs tracking-wide text-ink-faint uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Listings</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-content font-medium underline-offset-4 hover:underline"
                    >
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-ink-soft">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.banned ? (
                      <span className="rounded-sm border border-clay bg-clay-tint px-2 py-0.5 font-mono text-xs text-clay">
                        Suspended
                      </span>
                    ) : user.emailVerified ? (
                      <span className="rounded-sm border border-line-strong bg-forest-tint px-2 py-0.5 font-mono text-xs text-forest">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-sm border border-line-strong bg-paper px-2 py-0.5 font-mono text-xs text-ink-soft">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {user._count.coachings}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-faint">
                    {user.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="btn btn-secondary h-8 px-3 text-xs"
                    >
                      Open
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
          aria-label="Users pagination"
          className="flex items-center justify-center gap-2"
        >
          {shownPage > 1 && (
            <Link
              href={buildHref({ q, role, state, page: shownPage - 1 })}
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
              href={buildHref({ q, role, state, page: shownPage + 1 })}
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

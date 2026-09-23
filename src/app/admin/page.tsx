import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/listings/components/status-badge";
import type { ListingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Admin overview",
  description: "Moderation and account health at a glance.",
};

function StatCard({
  label,
  value,
  href,
  tone = "plain",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "plain" | "attention";
}) {
  return (
    <Link
      href={href}
      className={`rounded-sm border bg-paper-raised p-4 transition-colors hover:border-ink-soft ${
        tone === "attention" && value > 0 ? "border-clay" : "border-line"
      }`}
    >
      <p className="font-mono text-xs tracking-wide text-ink-faint uppercase">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-medium tabular-nums ${
          tone === "attention" && value > 0 ? "text-clay" : "text-ink"
        }`}
      >
        {value}
      </p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const [
    statusCounts,
    roleCounts,
    banned,
    unverified,
    areas,
    categories,
    recent,
  ] = await Promise.all([
    prisma.coaching.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { emailVerified: false } }),
    prisma.area.count(),
    prisma.category.count(),
    prisma.listingAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        note: true,
        createdAt: true,
        actorId: true,
        coaching: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const listingCount = (status: ListingStatus) =>
    statusCounts.find((c) => c.status === status)?._count._all ?? 0;
  const totalListings = statusCounts.reduce((n, c) => n + c._count._all, 0);
  const roleCount = (role: "ADMIN" | "OWNER") =>
    roleCounts.find((c) => c.role === role)?._count._all ?? 0;
  const totalUsers = roleCounts.reduce((n, c) => n + c._count._all, 0);

  const actorIds = [...new Set(recent.map((entry) => entry.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(actors.map((a) => [a.id, a.email]));

  return (
    <div className="grid gap-8">
      <AdminPageHeader
        title="Overview"
        description="What needs attention, and what happened recently."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pending review"
          value={listingCount("PENDING")}
          href="/admin/listings?status=PENDING"
          tone="attention"
        />
        <StatCard
          label="Published"
          value={listingCount("PUBLISHED")}
          href="/admin/listings?status=PUBLISHED"
        />
        <StatCard
          label="Total listings"
          value={totalListings}
          href="/admin/listings?status="
        />
        <StatCard label="Users" value={totalUsers} href="/admin/users" />
        <StatCard
          label="Suspended"
          value={banned}
          href="/admin/users?state=banned"
          tone="attention"
        />
        <StatCard
          label="Unverified emails"
          value={unverified}
          href="/admin/users?state=unverified"
        />
      </section>

      <section className="grid gap-3 rounded-sm border border-line bg-paper-raised p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h3 className="font-display text-lg font-medium">Directory data</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {areas} area{areas === 1 ? "" : "s"} · {categories} categor
            {categories === 1 ? "y" : "ies"} · {roleCount("ADMIN")} admin
            {roleCount("ADMIN") === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/taxonomy"
          className="btn btn-secondary h-9 px-4 text-[13px]"
        >
          Manage areas & categories
        </Link>
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <h3 className="font-display text-lg font-medium">Recent activity</h3>
          <Link
            href="/admin/activity"
            className="font-mono text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-sm border border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
            No listing activity yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="grid gap-1 rounded-sm border border-line bg-paper-raised px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/listings/${entry.coaching.id}`}
                    className="font-content text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {entry.coaching.name}
                  </Link>
                  <StatusBadge status={entry.toStatus} />
                </div>
                <p className="font-mono text-xs text-ink-faint">
                  {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
                  · {entry.fromStatus} → {entry.toStatus} ·{" "}
                  {emailById.get(entry.actorId) ?? entry.actorId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

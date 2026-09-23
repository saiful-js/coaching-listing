import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { UserAccountActions } from "@/features/admin/components/user-account-actions";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Account",
  description: "Support a user account.",
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2 first:border-t-0">
      <dt className="font-mono text-xs tracking-wide text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      banned: true,
      banReason: true,
      banExpires: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { coachings: true, sessions: true } },
      accounts: { select: { providerId: true } },
    },
  });
  if (!user) {
    notFound();
  }
  const listings = await prisma.coaching.findMany({
    where: { ownerId: id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      area: { select: { nameEn: true } },
    },
  });
  const providers = [...new Set(user.accounts.map((a) => a.providerId))];

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: user.name },
        ]}
        title={user.name}
        description={user.email}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <section className="rounded-sm border border-line bg-paper-raised p-5">
            <h3 className="font-display text-lg font-medium">Account</h3>
            <dl className="mt-3">
              <Row label="Role">
                <span className="font-mono text-xs">{user.role}</span>
              </Row>
              <Row label="Email">
                {user.emailVerified ? (
                  <span className="text-forest">Verified</span>
                ) : (
                  <span className="text-clay">Not verified</span>
                )}
              </Row>
              <Row label="Status">
                {user.banned ? (
                  <span className="text-clay">Suspended</span>
                ) : (
                  <span className="text-forest">Active</span>
                )}
              </Row>
              <Row label="Sign-in">
                {providers.length > 0 ? providers.join(", ") : "email/password"}
              </Row>
              <Row label="Listings">{user._count.coachings}</Row>
              <Row label="Active sessions">{user._count.sessions}</Row>
              <Row label="Joined">
                <span className="font-mono text-xs">
                  {user.createdAt.toISOString().slice(0, 10)}
                </span>
              </Row>
              <Row label="Account id">
                <span className="font-mono text-xs break-all text-ink-faint">
                  {user.id}
                </span>
              </Row>
            </dl>
          </section>

          <section className="grid gap-3">
            <h3 className="font-display text-lg font-medium">
              Listings ({listings.length})
            </h3>
            {listings.length === 0 ? (
              <p className="rounded-sm border border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
                This account has no listings.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-sm border border-line">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead className="bg-forest-mist text-left font-mono text-xs tracking-wide text-ink-faint uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="px-4 py-3 font-medium">Area</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
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
                          {listing.area.nameEn}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={listing.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-faint">
                          {listing.updatedAt.toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <UserAccountActions
          user={{
            id: user.id,
            role: user.role,
            emailVerified: user.emailVerified,
            banned: user.banned,
            banReason: user.banReason,
            banExpires: user.banExpires ? user.banExpires.toISOString() : null,
          }}
          isSelf={admin.id === user.id}
        />
      </div>
    </div>
  );
}

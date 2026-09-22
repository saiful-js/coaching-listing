import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModerationActions } from "@/features/admin/components/moderation-actions";
import { safeFacebookUrl } from "@/features/listings";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { cloudinaryUrl } from "@/features/uploads";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Review listing",
  description: "Review a coaching listing in full before moderating.",
};

/**
 * Admin review detail: every field, all photos, owner contact, and the full
 * audit trail — everything needed to approve or reject with confidence.
 */
export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await prisma.coaching.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      addressLine: true,
      phone: true,
      whatsapp: true,
      email: true,
      facebookUrl: true,
      status: true,
      rejectionReason: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      area: { select: { nameEn: true, nameBn: true } },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { nameEn: true, nameBn: true },
      },
      images: {
        orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
        select: {
          id: true,
          key: true,
          width: true,
          height: true,
          isCover: true,
        },
      },
      owner: { select: { id: true, email: true, emailVerified: true } },
      auditLogs: {
        orderBy: { createdAt: "asc" },
        select: {
          actorId: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
  if (!listing) {
    notFound();
  }
  const actorIds = [...new Set(listing.auditLogs.map((a) => a.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, role: true },
  });
  const actorById = new Map(actors.map((a) => [a.id, a]));
  const facebookHref = safeFacebookUrl(listing.facebookUrl);

  return (
    <div>
      <Link
        href="/admin/listings?status=PENDING"
        className="font-mono text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        ← Back to queue
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          <span className="font-content">{listing.name}</span>
        </h1>
        <StatusBadge status={listing.status} />
      </div>
      <p className="mt-2 font-mono text-xs text-ink-faint">
        Owner: {listing.owner.email}
        {listing.owner.emailVerified ? " (verified)" : " (UNVERIFIED)"} ·
        Created {listing.createdAt.toISOString().slice(0, 10)} · Updated{" "}
        {listing.updatedAt.toISOString().slice(0, 10)}
        {listing.publishedAt &&
          ` · Published ${listing.publishedAt.toISOString().slice(0, 10)}`}
      </p>

      {(listing.status === "PENDING" || listing.status === "PUBLISHED") && (
        <div className="mt-5 max-w-xl rounded-sm border border-line bg-paper-raised p-4">
          <ModerationActions id={listing.id} status={listing.status} />
        </div>
      )}
      {listing.status === "REJECTED" && listing.rejectionReason && (
        <p
          role="note"
          className="mt-5 rounded-sm border border-clay bg-clay-tint p-3 text-sm text-ink"
        >
          Rejection reason: {listing.rejectionReason}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          {listing.images.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {listing.images.map((image) => (
                <li
                  key={image.id}
                  className="overflow-hidden rounded-sm border border-line"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={cloudinaryUrl(image.key, 800)}
                      alt={image.isCover ? "Cover photo" : "Listing photo"}
                      fill
                      sizes="(max-width: 1024px) 50vw, 35vw"
                    />
                  </div>
                  {image.isCover && (
                    <p className="bg-forest-tint px-3 py-1 font-mono text-xs text-forest">
                      Cover · {image.width}×{image.height}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <section>
            <h2 className="font-display text-lg font-medium">Details</h2>
            <p className="font-content mt-2 leading-8 whitespace-pre-line text-ink">
              {listing.description}
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-medium">
              Classes & subjects
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {listing.categories.map((category) => (
                <li
                  key={category.nameEn}
                  className="inline-flex h-9 items-center rounded-full border border-line bg-paper-raised px-4 text-sm text-ink-soft"
                >
                  <span className="font-content">{category.nameEn}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg font-medium">Audit trail</h2>
            {listing.auditLogs.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                No transitions yet — still a draft.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {listing.auditLogs.map((log, i) => (
                  <li
                    key={`${log.actorId}-${log.createdAt.toISOString()}-${i}`}
                    className="rounded-sm border border-line bg-paper-raised px-4 py-3 font-mono text-xs text-ink-soft"
                  >
                    {log.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
                    · {actorById.get(log.actorId)?.email ?? log.actorId} (
                    {actorById.get(log.actorId)?.role ?? "?"}) ·{" "}
                    {log.fromStatus} → {log.toStatus}
                    {log.note && (
                      <span className="mt-1 block font-sans text-sm text-ink">
                        “{log.note}”
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-3 rounded-sm border border-line bg-paper-raised p-5">
          <h2 className="font-display text-lg font-medium">Contact</h2>
          <p className="font-content text-sm text-ink">{listing.addressLine}</p>
          <p className="text-sm text-ink">
            <span className="font-content">{listing.area.nameEn}</span>
          </p>
          <a href={`tel:${listing.phone}`} className="btn btn-primary">
            Call {listing.phone}
          </a>
          {listing.whatsapp && (
            <a
              href={`https://wa.me/${listing.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              WhatsApp
            </a>
          )}
          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              className="break-all text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              {listing.email}
            </a>
          )}
          {facebookHref && (
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Facebook page
            </a>
          )}
          {listing.status === "PUBLISHED" && (
            <Link
              href={`/coachings/${listing.slug}`}
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              View public page →
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

import type { ListingStatus } from "@/generated/prisma/client";

const BADGE: Record<ListingStatus, string> = {
  DRAFT: "bg-paper-raised text-ink-soft border-line-strong",
  PENDING: "bg-clay-tint text-ink border-line-strong",
  PUBLISHED: "bg-forest-tint text-forest border-forest",
  REJECTED: "bg-clay-tint text-clay border-clay",
  ARCHIVED: "bg-paper-raised text-ink-faint border-line-strong",
};

const LABEL: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  PENDING: "In review",
  PUBLISHED: "Published",
  REJECTED: "Needs changes",
  ARCHIVED: "Archived",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-sm border px-2 font-mono text-xs ${BADGE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}

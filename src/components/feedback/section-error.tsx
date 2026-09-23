"use client";

import Link from "next/link";

/**
 * Shared fallback for route-level `error.tsx` boundaries. The boundary files
 * stay tiny; this owns the copy and the recovery affordances.
 */
export function SectionError({
  retry,
  title = "This section is unavailable right now",
  description = "Something went wrong. Try again in a moment.",
  homeHref = "/",
  homeLabel = "Go home",
}: {
  retry: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="rounded-sm border border-line bg-paper-raised px-6 py-16 text-center">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
        {description}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button type="button" onClick={retry} className="btn btn-primary">
          Try again
        </button>
        <Link href={homeHref} className="btn btn-secondary">
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}

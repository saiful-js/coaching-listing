"use client";

import Link from "next/link";

export default function CoachingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        The directory is unavailable right now
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
        Something went wrong loading these listings. Try again — your filters
        are kept in the address bar.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/coachings" className="btn btn-secondary">
          Clear filters
        </Link>
      </div>
    </div>
  );
}

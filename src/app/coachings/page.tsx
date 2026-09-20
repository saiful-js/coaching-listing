import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "All coaching centres",
  description:
    "Browse every coaching centre in the Narayanganj Coaching Directory — filter by area and class level.",
};

/**
 * Static shell for the browse page (M0). The real list — nuqs filters in the
 * URL, 12 per page, DB-backed — lands in M5. Until then this shows the
 * honest empty state.
 */
export default function CoachingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="eyebrow">Directory</p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
        All coaching centres
      </h1>
      <div className="mt-12 rounded-lg border border-dashed border-line-strong bg-paper-raised px-6 py-16 text-center">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Nothing published yet
        </h2>
        <p className="mx-auto mt-2 max-w-md leading-7 text-ink-soft">
          The first listings arrive once owners sign up and each one is
          reviewed. The directory opens soon.
        </p>
        <Link href="/" className="btn btn-secondary mt-8">
          Back to home
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { site } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label={site.name}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-sm bg-forest font-display text-sm font-semibold text-paper"
          >
            N
          </span>
          <span className="font-display text-lg font-medium tracking-tight">
            {site.shortName}
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm">
          <Link
            href="/coachings"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            Browse
          </Link>
          <Link
            href="/#owners"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            For owners
          </Link>
        </nav>
      </div>
    </header>
  );
}

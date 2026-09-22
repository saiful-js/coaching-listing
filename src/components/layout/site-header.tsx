import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import { site } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
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
        <SiteNav />
      </div>
    </header>
  );
}

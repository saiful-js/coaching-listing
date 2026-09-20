import Link from "next/link";
import { site } from "@/config/site";
import { areas } from "@/config/taxonomy";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-medium tracking-tight">
              {site.shortName}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-ink-soft">
              {site.description}
            </p>
          </div>
          <nav aria-label="Areas">
            <p className="eyebrow">Areas</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {areas.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={`/coachings?area=${area.slug}`}
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {area.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Site">
            <p className="eyebrow">Directory</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  href="/coachings"
                  className="text-ink-soft transition-colors hover:text-ink"
                >
                  All coaching centres
                </Link>
              </li>
              <li>
                <Link
                  href="/#owners"
                  className="text-ink-soft transition-colors hover:text-ink"
                >
                  For coaching owners
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 border-t border-line pt-6">
          <p className="font-mono text-xs text-ink-faint">
            © 2026 {site.name} · Made for Narayanganj
          </p>
        </div>
      </div>
    </footer>
  );
}

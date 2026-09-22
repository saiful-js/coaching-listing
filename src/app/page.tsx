import Link from "next/link";
import { areas, categories } from "@/config/taxonomy";

/**
 * Static foundation page (M0). Data arrives from the database in M5 — until
 * then the area/category lists render from src/config/taxonomy.ts and listing
 * counts are placeholders.
 */
export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="eyebrow">Narayanganj · Dhaka Division</p>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-5xl leading-[1.04] font-medium tracking-tight sm:text-6xl">
            Find the right coaching centre, area by area.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">
            A hand-checked directory of coaching centres across Narayanganj —
            from Sadar to Sonargaon. Free to browse, with phone and WhatsApp on
            every listing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/coachings" className="btn btn-primary">
              Browse coachings
            </Link>
            <Link href="/#areas" className="btn btn-secondary">
              Explore areas
            </Link>
          </div>
        </div>
      </section>

      {/* Areas — editorial list, not a card grid */}
      <section id="areas" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Explore by area
            </h2>
            <span className="font-mono text-xs text-ink-faint">
              {areas.length} areas
            </span>
          </div>
          <ul className="mt-8 grid border-t border-line sm:grid-cols-2 sm:gap-x-12">
            {areas.map((area) => (
              <li key={area.slug} className="border-b border-line">
                <Link
                  href={`/coachings?area=${area.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-4 pr-2 transition-colors hover:bg-paper-raised"
                >
                  <span className="font-display text-lg font-medium tracking-tight">
                    {area.nameEn}
                  </span>
                  <span className="flex items-center gap-3 font-mono text-xs text-ink-faint">
                    <span>— listings</span>
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Browse by class or subject
          </h2>
          <ul className="mt-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/coachings?category=${category.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-line bg-paper-raised px-4 text-sm text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
                >
                  {category.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Owners */}
      <section id="owners" className="scroll-mt-16">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">For coaching owners</p>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Own a coaching centre in Narayanganj?
            </h2>
            <p className="mt-5 leading-7 text-ink-soft">
              Get a free listing with your address, categories, and contact
              details. Create an account, add your coaching in minutes, and
              reach students already searching in your area. Every listing is
              reviewed before it goes live — that is what keeps the directory
              worth trusting.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn btn-primary">
                List your coaching
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                Owner dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

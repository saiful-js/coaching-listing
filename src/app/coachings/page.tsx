import Link from "next/link";
import {
  PAGE_SIZE,
  allCategories,
  areasWithCounts,
  listPublished,
} from "@/features/listings";
import { ListingCard } from "@/features/listings/components/listing-card";

export const metadata = {
  title: "All coaching centres",
  description:
    "Browse coaching centres across Narayanganj — filter by area, class level, or search.",
};

function pageHref(
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  search.set("page", String(page));
  return `/coachings?${search.toString()}`;
}

export default async function CoachingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const q = first(params.q);
  const areaSlug = first(params.area) || undefined;
  const categorySlug = first(params.category) || undefined;
  const page = Number.parseInt(first(params.page), 10);

  const [{ items, total, pages }, areas, categories] = await Promise.all([
    listPublished({ q, areaSlug, categorySlug, page }),
    areasWithCounts(),
    allCategories(),
  ]);
  const hasFilters = Boolean(q || areaSlug || categorySlug);
  const shownPage = Number.isInteger(page) && page > 0 ? page : 1;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Directory</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        All coaching centres
      </h1>

      <form
        method="get"
        action="/coachings"
        className="mt-8 grid gap-3 rounded-sm border border-line bg-paper-raised p-4 sm:grid-cols-[1fr_180px_180px_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <label htmlFor="browse-q" className="text-sm font-medium text-ink">
            Search
          </label>
          <input
            id="browse-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, road, or keyword…"
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="browse-area" className="text-sm font-medium text-ink">
            Area
          </label>
          <select
            id="browse-area"
            name="area"
            defaultValue={areaSlug ?? ""}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="">All areas</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.nameEn} ({area.count})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label
            htmlFor="browse-category"
            className="text-sm font-medium text-ink"
          >
            Category
          </label>
          <select
            id="browse-category"
            name="category"
            defaultValue={categorySlug ?? ""}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.nameEn}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary h-11">
          Filter
        </button>
      </form>

      <p className="mt-6 font-mono text-xs text-ink-faint" aria-live="polite">
        {total} {total === 1 ? "listing" : "listings"}
        {` · page ${shownPage} of ${pages}`}
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-sm border border-line bg-paper-raised p-8 text-center">
          <h2 className="font-display text-xl font-medium tracking-tight">
            No coaching centres found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
            {hasFilters
              ? "Nothing matches those filters. Try widening the search."
              : "The first listings arrive once owners sign up and each one is reviewed."}
          </p>
          {hasFilters && (
            <Link href="/coachings" className="btn btn-secondary mt-6">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-10 flex items-center justify-center gap-2"
            >
              {shownPage > 1 && (
                <Link
                  href={pageHref({ q, area: areaSlug, category: categorySlug }, shownPage - 1)}
                  className="btn btn-secondary h-10 px-4 text-sm"
                >
                  ← Previous
                </Link>
              )}
              <span className="font-mono text-xs text-ink-faint">
                {shownPage} / {pages}
              </span>
              {shownPage < pages && (
                <Link
                  href={pageHref({ q, area: areaSlug, category: categorySlug }, shownPage + 1)}
                  className="btn btn-secondary h-10 px-4 text-sm"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
          <p className="mt-4 text-center font-mono text-xs text-ink-faint">
            Showing {(shownPage - 1) * PAGE_SIZE + 1}–
            {(shownPage - 1) * PAGE_SIZE + items.length} of {total}
          </p>
        </>
      )}
    </div>
  );
}

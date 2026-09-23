/**
 * Loading placeholders for route `loading.tsx` files. Static keys (never
 * array indexes) so Biome's noArrayIndexKey stays clean.
 */
const CARD_IDS = ["c1", "c2", "c3", "c4", "c5", "c6"];
const ROW_IDS = ["r1", "r2", "r3", "r4"];

/** Card grid — mirrors the public directory / area listing layout. */
export function CardGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-live="polite"
      className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {CARD_IDS.map((id) => (
        <li
          key={id}
          className="overflow-hidden rounded-sm border border-line bg-paper-raised"
        >
          <div className="aspect-[16/10] w-full animate-pulse bg-forest-mist" />
          <div className="grid gap-2 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded-sm bg-line" />
            <div className="h-4 w-1/2 animate-pulse rounded-sm bg-line" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Stacked rows — mirrors the dashboard and admin queue layouts. */
export function RowListSkeleton() {
  return (
    <ul aria-busy="true" aria-live="polite" className="grid gap-4">
      {ROW_IDS.map((id) => (
        <li
          key={id}
          className="grid gap-3 rounded-sm border border-line bg-paper-raised p-5"
        >
          <div className="h-5 w-1/2 animate-pulse rounded-sm bg-line" />
          <div className="h-4 w-1/3 animate-pulse rounded-sm bg-line" />
        </li>
      ))}
    </ul>
  );
}

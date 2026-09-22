export default function CoachingsLoading() {
  const skeletonKeys = [
    "skeleton-1",
    "skeleton-2",
    "skeleton-3",
    "skeleton-4",
    "skeleton-5",
    "skeleton-6",
  ];

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="eyebrow">Directory</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        All coaching centres
      </h1>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skeletonKeys.map((key) => (
          <li
            key={key}
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
    </div>
  );
}

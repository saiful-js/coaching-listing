import { RowListSkeleton } from "@/components/feedback/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Owner dashboard</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        My listings
      </h1>
      <div className="mt-8">
        <RowListSkeleton />
      </div>
    </div>
  );
}

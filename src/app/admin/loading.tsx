import { RowListSkeleton } from "@/components/feedback/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-4">
      <div className="h-7 w-48 animate-pulse rounded-sm bg-line" />
      <RowListSkeleton />
    </div>
  );
}

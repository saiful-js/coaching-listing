import { CardGridSkeleton } from "@/components/feedback/skeleton";

export default function AreaLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Narayanganj · Areas</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        Loading coaching centres…
      </h1>
      <CardGridSkeleton />
    </div>
  );
}

"use client";

import { SectionError } from "@/components/feedback/section-error";

export default function DashboardError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <SectionError
        retry={retry}
        title="Your dashboard didn't load"
        description="We couldn't load your listings. Try again — nothing you saved is lost."
        homeHref="/"
        homeLabel="Go home"
      />
    </div>
  );
}

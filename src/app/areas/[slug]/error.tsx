"use client";

import { SectionError } from "@/components/feedback/section-error";

export default function AreaError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <SectionError
        retry={retry}
        title="This area didn't load"
        description="We couldn't load the centres for this area. Try again, or browse everything."
        homeHref="/coachings"
        homeLabel="Browse all centres"
      />
    </div>
  );
}

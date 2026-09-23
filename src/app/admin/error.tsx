"use client";

import { SectionError } from "@/components/feedback/section-error";

export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <SectionError
      retry={retry}
      title="The moderation queue didn't load"
      description="We couldn't load listings for review. Try again in a moment."
      homeHref="/admin/listings?status=PENDING"
      homeLabel="Back to queue"
    />
  );
}

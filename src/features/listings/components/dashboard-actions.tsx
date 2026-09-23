"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  archiveListingAction,
  submitListingAction,
} from "@/features/listings/actions";

import type { ListingStatus } from "@/generated/prisma/client";

export function DashboardActions({
  id,
  status,
}: {
  id: string;
  status: ListingStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "submit" | "archive") {
    setPending(kind);
    setError(null);
    const result =
      kind === "submit"
        ? await submitListingAction(id)
        : await archiveListingAction(id);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(null);
      return;
    }
    // Clear the busy state before refreshing so the button never stays stuck
    // on success.
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(status === "DRAFT" || status === "REJECTED") && (
        <button
          type="button"
          className="btn btn-primary h-9 px-4 text-[13px]"
          disabled={pending !== null}
          onClick={() => run("submit")}
        >
          {pending === "submit" ? "Submitting…" : "Submit for review"}
        </button>
      )}
      {(status === "DRAFT" || status === "PUBLISHED") && (
        <button
          type="button"
          className="btn btn-secondary h-9 px-4 text-[13px]"
          disabled={pending !== null}
          onClick={() => run("archive")}
        >
          {pending === "archive" ? "Archiving…" : "Archive"}
        </button>
      )}
      {error && (
        <p role="alert" aria-live="assertive" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

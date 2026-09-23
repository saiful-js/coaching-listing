"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteListingAction } from "@/features/listings/actions";

/**
 * Permanent deletion is irreversible (images + audit trail cascade), so it
 * always takes two clicks: Delete → Delete permanently. `redirectTo` sends
 * the admin back to the queue once the listing is gone.
 */
export function DeleteListingButton({
  id,
  redirectTo,
  label = "Delete",
}: {
  id: string;
  /** Navigate here after a successful delete (e.g. back to the admin queue). */
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteListingAction(id);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(false);
      setConfirming(false);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-secondary h-9 px-4 text-[13px]"
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-danger h-9 px-4 text-[13px]"
        disabled={pending}
        onClick={onDelete}
      >
        {pending ? "Deleting…" : "Delete permanently"}
      </button>
      <button
        type="button"
        className="btn btn-secondary h-9 px-4 text-[13px]"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
      {error && (
        <p role="alert" aria-live="assertive" className="text-sm text-clay">
          {error}
        </p>
      )}
    </span>
  );
}

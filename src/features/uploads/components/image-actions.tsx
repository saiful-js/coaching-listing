"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteImageAction, setCoverAction } from "@/features/uploads/actions";

const chip =
  "rounded-sm border px-2 py-1 font-mono text-xs disabled:opacity-60";

export function ImageActions({
  imageId,
  isCover,
}: {
  imageId: string;
  isCover: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"cover" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "cover" | "delete") {
    setPending(action);
    setError(null);
    const result =
      action === "cover"
        ? await setCoverAction(imageId)
        : await deleteImageAction(imageId);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(null);
      setConfirming(false);
      return;
    }
    // Clear the busy state before refreshing so the control never stays
    // stuck on success.
    setPending(null);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="font-mono text-xs text-ink-soft">Delete this?</span>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("delete")}
          className={`${chip} border-clay bg-clay-tint text-clay`}
        >
          {pending === "delete" ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => setConfirming(false)}
          className={`${chip} border-line-strong bg-paper-raised text-ink`}
        >
          Cancel
        </button>
        {error && (
          <p role="alert" className="text-xs text-clay">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isCover && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("cover")}
          className={`${chip} border-line-strong bg-paper-raised text-ink`}
        >
          {pending === "cover" ? "Setting…" : "Set cover"}
        </button>
      )}
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => setConfirming(true)}
        className={`${chip} border-line-strong bg-paper-raised text-clay`}
      >
        Delete
      </button>
      {error && (
        <p role="alert" className="text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}

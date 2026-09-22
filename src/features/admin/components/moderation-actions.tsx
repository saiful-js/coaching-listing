"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  approveListingAction,
  rejectListingAction,
  unpublishListingAction,
} from "@/features/admin/actions";
import { FormError } from "@/features/auth";

export function ModerationActions({
  id,
  status,
}: {
  id: string;
  status: "PENDING" | "PUBLISHED";
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function run(kind: "approve" | "reject" | "unpublish") {
    setPending(kind);
    setError(null);
    const result =
      kind === "approve"
        ? await approveListingAction(id)
        : kind === "reject"
          ? await rejectListingAction(id, reason)
          : await unpublishListingAction(id);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(null);
      return;
    }
    setPending(null);
    setRejecting(false);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button
              type="button"
              className="btn btn-primary h-9 px-4 text-[13px]"
              disabled={pending !== null}
              onClick={() => run("approve")}
            >
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              className="btn btn-secondary h-9 px-4 text-[13px]"
              disabled={pending !== null}
              onClick={() => setRejecting((v) => !v)}
            >
              Reject
            </button>
          </>
        )}
        {status === "PUBLISHED" && (
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={pending !== null}
            onClick={() => run("unpublish")}
          >
            {pending === "unpublish" ? "Unpublishing…" : "Unpublish"}
          </button>
        )}
      </div>
      {rejecting && status === "PENDING" && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) {
              setError(
                "Give the owner a reason — it is shown on their dashboard.",
              );
              return;
            }
            run("reject");
          }}
        >
          <label
            htmlFor={`reject-reason-${id}`}
            className="text-sm font-medium text-ink"
          >
            Reason (shown to the owner)
          </label>
          <textarea
            id={`reject-reason-${id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            className="btn btn-secondary h-9 justify-self-start px-4 text-[13px]"
            disabled={pending !== null}
          >
            {pending === "reject" ? "Rejecting…" : "Confirm reject"}
          </button>
        </form>
      )}
      <FormError message={error} />
    </div>
  );
}

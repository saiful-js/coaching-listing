"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteImageAction, setCoverAction } from "@/features/uploads/actions";

export function ImageActions({
  imageId,
  isCover,
}: {
  imageId: string;
  isCover: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: "cover" | "delete") {
    if (
      action === "delete" &&
      !window.confirm("Delete this photo permanently?")
    ) {
      return;
    }
    setPending(true);
    const result =
      action === "cover"
        ? await setCoverAction(imageId)
        : await deleteImageAction(imageId);
    if (!result.ok) {
      window.alert(result.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {!isCover && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("cover")}
          className="rounded-sm border border-line-strong bg-paper-raised px-2 py-1 font-mono text-xs text-ink"
        >
          Set cover
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run("delete")}
        className="rounded-sm border border-line-strong bg-paper-raised px-2 py-1 font-mono text-xs text-clay"
      >
        Delete
      </button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormError } from "@/features/auth";
import { uploadImageAction } from "@/features/uploads/actions";

export function ImageUploader({
  coachingId,
  imageCount,
}: {
  coachingId: string;
  imageCount: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = 6 - imageCount;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a JPEG, PNG, or WebP file first (max 5 MB).");
      return;
    }
    setPending(true);
    const result = await uploadImageAction(coachingId, form);
    if (!result.ok) {
      setError(result.error ?? "Upload failed.");
      setPending(false);
      return;
    }
    inputRef.current?.form?.reset();
    setPending(false);
    router.refresh();
  }

  if (remaining <= 0) {
    return (
      <p className="text-sm text-ink-soft">
        Image limit reached (6 per listing). Delete one to upload another.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label
        htmlFor={`upload-${coachingId}`}
        className="text-sm font-medium text-ink"
      >
        Add a photo ({remaining} of 6 left · JPEG/PNG/WebP · max 5 MB)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={`upload-${coachingId}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="text-sm text-ink-soft file:mr-3 file:h-9 file:rounded-sm file:border file:border-line-strong file:bg-paper-raised file:px-4 file:text-[13px] file:text-ink"
        />
        <button
          type="submit"
          className="btn btn-secondary h-9 px-4 text-[13px]"
          disabled={pending}
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <FormError message={error} />
    </form>
  );
}

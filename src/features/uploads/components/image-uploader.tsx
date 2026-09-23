"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormError } from "@/features/auth";
import { uploadImageAction } from "@/features/uploads/actions";
import {
  ALLOWED_IMAGE_ACCEPT,
  MAX_IMAGE_MB,
  MAX_IMAGES_PER_LISTING,
} from "@/features/uploads/limits";

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

  const remaining = MAX_IMAGES_PER_LISTING - imageCount;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(
        `Choose a JPEG, PNG, or WebP file first (max ${MAX_IMAGE_MB} MB).`,
      );
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
        Image limit reached ({MAX_IMAGES_PER_LISTING} per listing). Delete one
        to upload another.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label
        htmlFor={`upload-${coachingId}`}
        className="text-sm font-medium text-ink"
      >
        Add a photo ({remaining} of {MAX_IMAGES_PER_LISTING} left ·
        JPEG/PNG/WebP · max {MAX_IMAGE_MB} MB)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={`upload-${coachingId}`}
          name="file"
          type="file"
          accept={ALLOWED_IMAGE_ACCEPT}
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

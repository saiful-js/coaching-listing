"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, TextInput } from "@/features/auth";
import {
  createListingAction,
  updateListingAction,
} from "@/features/listings/actions";
import {
  type CreateCoachingInput,
  createCoachingSchema,
} from "@/features/listings/schemas";
import { uploadImageAction } from "@/features/uploads/actions";
import {
  ALLOWED_IMAGE_ACCEPT,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  MAX_IMAGES_PER_LISTING,
} from "@/features/uploads/limits";
import type { ListingStatus } from "@/generated/prisma/client";

export interface ListingOption {
  id: string;
  nameEn: string;
  nameBn: string;
}

const DESCRIPTION_MAX = 5000;

const textAreaClassName =
  "min-h-32 w-full rounded-sm border border-line-strong bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest";

const fileInputClassName =
  "text-sm text-ink-soft file:mr-3 file:h-9 file:rounded-sm file:border file:border-line-strong file:bg-paper-raised file:px-4 file:text-[13px] file:text-ink";

/** Client-side pre-check so we never create a draft we then can't fill. */
function validatePhotos(files: File[]): string | null {
  if (files.length > MAX_IMAGES_PER_LISTING) {
    return `Choose at most ${MAX_IMAGES_PER_LISTING} photos at a time.`;
  }
  for (const file of files) {
    if (!isAllowedImageType(file.type)) {
      return "Photos must be JPEG, PNG, or WebP.";
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `Each photo must be ${MAX_IMAGE_MB} MB or smaller.`;
    }
  }
  return null;
}

export function ListingForm({
  mode,
  listingId,
  status,
  initial,
  areas,
  categories,
}: {
  mode: "create" | "edit";
  listingId?: string;
  /** Present in edit mode — a published listing updates live. */
  status?: ListingStatus;
  initial?: Partial<CreateCoachingInput>;
  areas: ListingOption[];
  categories: ListingOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoCount, setPhotoCount] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState(
    initial?.description?.length ?? 0,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const categoryIds = form.getAll("categoryIds").map(String);
    const parsed = createCoachingSchema.safeParse({
      name: String(form.get("name") ?? ""),
      areaId: String(form.get("areaId") ?? ""),
      addressLine: String(form.get("addressLine") ?? ""),
      description: String(form.get("description") ?? ""),
      categoryIds,
      phone: String(form.get("phone") ?? ""),
      whatsapp: String(form.get("whatsapp") ?? "") || undefined,
      email: String(form.get("email") ?? "") || undefined,
      facebookUrl: String(form.get("facebookUrl") ?? "") || undefined,
    });
    if (!parsed.success) {
      // Map every issue to its field so the owner sees all of them at once,
      // not just the first.
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      setError("Check the highlighted fields.");
      return;
    }

    // Photos are only offered while creating; validate them before we
    // create the draft so a bad selection cannot leave a half-done listing.
    let photos: File[] = [];
    if (mode === "create") {
      photos = form
        .getAll("photos")
        .filter((entry): entry is File => entry instanceof File)
        .filter((file) => file.size > 0);
      const photoError = validatePhotos(photos);
      if (photoError) {
        setFieldErrors({ photos: photoError });
        setError("Check the highlighted fields.");
        return;
      }
    }

    setPending(true);

    if (mode === "edit") {
      setPhase("Saving…");
      const result = await updateListingAction(listingId ?? "", parsed.data);
      if (!result.ok) {
        setError(result.error ?? "Could not save the listing.");
        setPending(false);
        setPhase(null);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Create first: images need the listing's id (ownership + storage path).
    setPhase("Creating listing…");
    const created = await createListingAction(parsed.data);
    if (!created.ok || !created.id) {
      setError(created.error ?? "Could not create the listing.");
      setPending(false);
      setPhase(null);
      return;
    }
    const newId = created.id;

    let failed = 0;
    for (let i = 0; i < photos.length; i++) {
      setPhase(`Uploading photo ${i + 1} of ${photos.length}…`);
      const data = new FormData();
      data.append("file", photos[i] as File);
      const uploaded = await uploadImageAction(newId, data);
      if (!uploaded.ok) {
        failed += 1;
      }
    }
    if (failed > 0) {
      // The draft exists; the edit page has a retryable uploader.
      router.push(`/dashboard/listings/${newId}/edit`);
      router.refresh();
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const buttonLabel = pending
    ? (phase ?? "Saving…")
    : mode === "create"
      ? "Create listing"
      : "Save changes";

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {mode === "edit" && status === "PUBLISHED" && (
        <p
          role="note"
          className="rounded-sm border border-line bg-forest-tint p-3 text-sm text-ink"
        >
          This listing is live — the changes you save appear on the public page
          immediately.
        </p>
      )}

      <Field
        id="listing-name"
        label="Coaching name (3–120 characters)"
        error={fieldErrors.name}
      >
        <TextInput
          id="listing-name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={120}
          defaultValue={initial?.name ?? ""}
          placeholder="e.g. Siddhirganj Ideal Coaching"
        />
      </Field>
      <Field id="listing-area" label="Area" error={fieldErrors.areaId}>
        <select
          id="listing-area"
          name="areaId"
          required
          defaultValue={initial?.areaId ?? ""}
          className="h-11 w-full rounded-sm border border-line-strong bg-paper-raised px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest"
        >
          <option value="" disabled>
            Select an area
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nameEn} · {area.nameBn}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="listing-address"
        label="Address (street / holding / landmark)"
        error={fieldErrors.addressLine}
      >
        <TextInput
          id="listing-address"
          name="addressLine"
          type="text"
          required
          minLength={5}
          maxLength={250}
          defaultValue={initial?.addressLine ?? ""}
        />
      </Field>
      <Field
        id="listing-description"
        label="Details (30–5000 characters, plain text)"
        error={fieldErrors.description}
      >
        <div className="grid gap-1">
          <textarea
            id="listing-description"
            name="description"
            required
            minLength={30}
            maxLength={DESCRIPTION_MAX}
            defaultValue={initial?.description ?? ""}
            onChange={(event) =>
              setDescriptionLength(event.currentTarget.value.length)
            }
            className={textAreaClassName}
          />
          <p
            aria-live="polite"
            className="text-right font-mono text-xs text-ink-faint"
          >
            {descriptionLength}/{DESCRIPTION_MAX}
          </p>
        </div>
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Categories (1–5)
        </legend>
        <div className="mt-2 grid gap-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={initial?.categoryIds?.includes(category.id)}
                className="size-4 accent-[#0e3a2c]"
              />
              {category.nameEn} · {category.nameBn}
            </label>
          ))}
        </div>
        {fieldErrors.categoryIds && (
          <p role="alert" className="mt-2 text-sm text-clay">
            {fieldErrors.categoryIds}
          </p>
        )}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="listing-phone"
          label="Contact phone"
          error={fieldErrors.phone}
        >
          <TextInput
            id="listing-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            defaultValue={initial?.phone ?? ""}
            placeholder="01712345678"
          />
        </Field>
        <Field
          id="listing-whatsapp"
          label="WhatsApp (optional)"
          error={fieldErrors.whatsapp}
        >
          <TextInput
            id="listing-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={initial?.whatsapp ?? ""}
            placeholder="01712345678"
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="listing-email"
          label="Email (optional)"
          error={fieldErrors.email}
        >
          <TextInput
            id="listing-email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder="you@example.com"
          />
        </Field>
        <Field
          id="listing-facebook"
          label="Facebook page URL (optional)"
          error={fieldErrors.facebookUrl}
        >
          <TextInput
            id="listing-facebook"
            name="facebookUrl"
            type="url"
            inputMode="url"
            defaultValue={initial?.facebookUrl ?? ""}
            placeholder="https://facebook.com/…"
          />
        </Field>
      </div>

      {mode === "create" && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-ink">
            Photos (optional)
          </legend>
          <p className="text-sm text-ink-soft">
            Up to {MAX_IMAGES_PER_LISTING} photos, JPEG/PNG/WebP, max{" "}
            {MAX_IMAGE_MB} MB each. The first one becomes the cover — you can
            change that later. You need at least one before submitting for
            review.
          </p>
          <input
            id="listing-photos"
            name="photos"
            type="file"
            multiple
            accept={ALLOWED_IMAGE_ACCEPT}
            disabled={pending}
            onChange={(event) =>
              setPhotoCount(event.currentTarget.files?.length ?? 0)
            }
            className={fileInputClassName}
          />
          {photoCount > 0 && (
            <p className="font-mono text-xs text-ink-faint" aria-live="polite">
              {photoCount} photo{photoCount === 1 ? "" : "s"} selected
            </p>
          )}
          {fieldErrors.photos && (
            <p role="alert" className="text-sm text-clay">
              {fieldErrors.photos}
            </p>
          )}
        </fieldset>
      )}

      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {buttonLabel}
        </button>
        <Link href="/dashboard" className="btn btn-secondary h-11 px-5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}

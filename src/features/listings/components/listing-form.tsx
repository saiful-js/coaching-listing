"use client";

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

export interface ListingOption {
  id: string;
  nameEn: string;
  nameBn: string;
}

const textAreaClassName =
  "min-h-32 w-full rounded-sm border border-line-strong bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest";

export function ListingForm({
  mode,
  listingId,
  initial,
  areas,
  categories,
}: {
  mode: "create" | "edit";
  listingId?: string;
  initial?: Partial<CreateCoachingInput>;
  areas: ListingOption[];
  categories: ListingOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
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
      setError(
        parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
      );
      return;
    }
    setPending(true);
    const result =
      mode === "create"
        ? await createListingAction(parsed.data)
        : await updateListingAction(listingId ?? "", parsed.data);
    if (!result.ok) {
      setError(result.error ?? "Could not save the listing.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field id="listing-name" label="Coaching name (3–120 characters)">
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
      <Field id="listing-area" label="Area">
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
      <Field id="listing-address" label="Address (street / holding / landmark)">
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
      >
        <textarea
          id="listing-description"
          name="description"
          required
          minLength={30}
          maxLength={5000}
          defaultValue={initial?.description ?? ""}
          className={textAreaClassName}
        />
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
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="listing-phone" label="Contact phone">
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
        <Field id="listing-whatsapp" label="WhatsApp (optional)">
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
        <Field id="listing-email" label="Email (optional)">
          <TextInput
            id="listing-email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder="you@example.com"
          />
        </Field>
        <Field id="listing-facebook" label="Facebook page URL (optional)">
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
      <FormError message={error} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create listing"
            : "Save changes"}
      </button>
    </form>
  );
}

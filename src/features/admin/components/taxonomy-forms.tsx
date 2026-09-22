"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createAreaAction,
  createCategoryAction,
} from "@/features/admin/actions";
import { FormError } from "@/features/auth";

function TaxonomyForm({ kind }: { kind: "area" | "category" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const input = {
      nameEn: String(form.get("nameEn") ?? ""),
      nameBn: String(form.get("nameBn") ?? ""),
    };
    setPending(true);
    const result =
      kind === "area"
        ? await createAreaAction(input)
        : await createCategoryAction(input);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    event.currentTarget.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label
            htmlFor={`${kind}-nameEn`}
            className="text-sm font-medium text-ink"
          >
            Name (English)
          </label>
          <input
            id={`${kind}-nameEn`}
            name="nameEn"
            type="text"
            required
            minLength={2}
            maxLength={100}
            disabled={pending}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          />
        </div>
        <div className="grid gap-1.5">
          <label
            htmlFor={`${kind}-nameBn`}
            className="text-sm font-medium text-ink"
          >
            Name (Bangla)
          </label>
          <input
            id={`${kind}-nameBn`}
            name="nameBn"
            type="text"
            required
            minLength={1}
            maxLength={100}
            disabled={pending}
            className="h-11 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          />
        </div>
      </div>
      <FormError message={error} />
      <button
        type="submit"
        className="btn btn-secondary h-10 justify-self-start px-4 text-sm"
        disabled={pending}
      >
        {pending ? "Adding…" : `Add ${kind}`}
      </button>
    </form>
  );
}

export function AreaForm() {
  return <TaxonomyForm kind="area" />;
}

export function CategoryForm() {
  return <TaxonomyForm kind="category" />;
}

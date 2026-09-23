"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createAreaAction,
  createCategoryAction,
  deleteAreaAction,
  deleteCategoryAction,
  updateAreaAction,
  updateCategoryAction,
} from "@/features/admin/actions";
import { FormError } from "@/features/auth";

export interface TaxonomyItem {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  count: number;
}

type Kind = "area" | "category";

function actionsFor(kind: Kind) {
  return kind === "area"
    ? {
        create: createAreaAction,
        update: updateAreaAction,
        remove: deleteAreaAction,
      }
    : {
        create: createCategoryAction,
        update: updateCategoryAction,
        remove: deleteCategoryAction,
      };
}

function CreateForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const api = actionsFor(kind);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // Capture the element before awaiting — currentTarget is only valid
    // during synchronous dispatch.
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const input = {
      nameEn: String(form.get("nameEn") ?? ""),
      nameBn: String(form.get("nameBn") ?? ""),
    };
    setPending(true);
    const result = await api.create(input);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    formEl.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-sm border border-line bg-paper-raised p-4"
    >
      <p className="font-mono text-xs tracking-wide text-ink-faint uppercase">
        Add {kind}
      </p>
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

function TaxonomyRow({ kind, item }: { kind: Kind; item: TaxonomyItem }) {
  const router = useRouter();
  const api = actionsFor(kind);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameEn, setNameEn] = useState(item.nameEn);
  const [nameBn, setNameBn] = useState(item.nameBn);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const result = await fn();
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    setPending(false);
    setEditing(false);
    setConfirming(false);
    router.refresh();
  }

  if (editing) {
    return (
      <li className="grid gap-2 rounded-sm border border-line bg-paper-raised px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label htmlFor={`edit-en-${item.id}`} className="sr-only">
            Name (English)
          </label>
          <input
            id={`edit-en-${item.id}`}
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            disabled={pending}
            maxLength={100}
            className="h-10 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          />
          <label htmlFor={`edit-bn-${item.id}`} className="sr-only">
            Name (Bangla)
          </label>
          <input
            id={`edit-bn-${item.id}`}
            value={nameBn}
            onChange={(event) => setNameBn(event.target.value)}
            disabled={pending}
            maxLength={100}
            className="h-10 w-full rounded-sm border border-line-strong bg-paper px-3 font-content text-sm text-ink"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary h-9 px-4 text-[13px]"
            disabled={pending}
            onClick={() =>
              run(() =>
                api.update({
                  id: item.id,
                  nameEn: nameEn.trim(),
                  nameBn: nameBn.trim(),
                }),
              )
            }
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setNameEn(item.nameEn);
              setNameBn(item.nameBn);
              setError(null);
            }}
          >
            Cancel
          </button>
          <span className="font-mono text-xs text-ink-faint">
            slug stays {item.slug}
          </span>
        </div>
        <FormError message={error} />
      </li>
    );
  }

  return (
    <li className="grid gap-2 rounded-sm border border-line bg-paper-raised px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm">
        <span className="font-content">{item.nameEn}</span>{" "}
        <span className="font-content text-ink-soft">· {item.nameBn}</span>
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-ink-faint">
          {item.count} listings
        </span>
        {confirming ? (
          <>
            <button
              type="button"
              className="btn btn-danger h-8 px-3 text-xs"
              disabled={pending}
              onClick={() => run(() => api.remove(item.id))}
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="btn btn-secondary h-8 px-3 text-xs"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary h-8 px-3 text-xs"
              onClick={() => setEditing(true)}
            >
              Rename
            </button>
            <button
              type="button"
              className="btn btn-secondary h-8 px-3 text-xs"
              disabled={item.count > 0}
              title={
                item.count > 0
                  ? "In use by listings — untag them first."
                  : undefined
              }
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </>
        )}
      </span>
      {error && (
        <p role="alert" className="text-sm text-clay sm:basis-full">
          {error}
        </p>
      )}
    </li>
  );
}

/** Create + inline rename/delete for areas or categories. */
export function TaxonomyManager({
  kind,
  label,
  items,
}: {
  kind: Kind;
  label: string;
  items: TaxonomyItem[];
}) {
  return (
    <section className="grid gap-4">
      <h3 className="font-display text-2xl font-medium tracking-tight">
        {label}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-sm border border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
          Nothing here yet.
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <TaxonomyRow key={item.id} kind={kind} item={item} />
          ))}
        </ul>
      )}
      <CreateForm kind={kind} />
    </section>
  );
}

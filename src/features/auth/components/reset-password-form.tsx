"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/features/auth/client";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { Field, FormError, TextInput } from "./form-fields";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="grid gap-3">
        <FormError message="This reset link is missing or invalid. Request a new one — links are single-use and expire after 1 hour." />
        <Link href="/forgot-password" className="btn btn-secondary">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      newPassword: String(form.get("newPassword") ?? ""),
    });
    if (!parsed.success) {
      setError("Choose a password of 8+ characters.");
      return;
    }
    setPending(true);
    await authClient.resetPassword(
      { newPassword: parsed.data.newPassword, token: parsed.data.token },
      {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
        onError: (ctx) => {
          setError(
            ctx.error.message ||
              "This link has expired or was already used. Request a new one.",
          );
          setPending(false);
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="reset-password" label="New password (8+ characters)">
        <TextInput
          id="reset-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { authClient } from "@/features/auth/client";
import { Field, FormError, FormNote, TextInput } from "./form-fields";

/**
 * Re-send the verification email (M2 follow-up). Better Auth's endpoint is
 * anti-enumeration: anonymous callers always get a 200, so success copy is
 * deliberately non-committal. Only 429 (rate-limited) is surfaced.
 */
export function ResendVerificationForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    if (!email) {
      setError("Enter the email address you registered with.");
      return;
    }
    setPending(true);
    await authClient.sendVerificationEmail(
      { email, callbackURL: "/verify-email?verified=1" },
      {
        onSuccess: () => {
          setSent(true);
          setPending(false);
        },
        onError: (ctx) => {
          if (ctx.error.status === 429) {
            setError("Too many requests. Try again in a few minutes.");
          } else {
            // Never reveal whether the address exists.
            setSent(true);
          }
          setPending(false);
        },
      },
    );
  }

  if (sent) {
    return (
      <FormNote>
        If that address has an unverified account, a fresh verification link is
        on its way.
      </FormNote>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="resend-email" label="Email">
        <TextInput
          id="resend-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { authClient } from "@/features/auth/client";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import {
  captchaHeaders,
  Field,
  FormError,
  FormNote,
  TextInput,
} from "./form-fields";

export function ForgotPasswordForm({
  captchaToken,
}: {
  /** Turnstile token once the widget is provisioned; omitted until then. */
  captchaToken?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: String(form.get("email") ?? ""),
    });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    await authClient.requestPasswordReset(
      { ...parsed.data, redirectTo: "/reset-password" },
      {
        ...captchaHeaders(captchaToken),
        onSuccess: () => {
          setSent(true);
          setPending(false);
        },
        onError: (ctx) => {
          // Never reveal whether the email exists; show the same note.
          if (ctx.error.status === 429) {
            setError("Too many attempts. Try again in a few minutes.");
          } else {
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
        If an account exists for that email, a single-use reset link is on its
        way. It expires in 1 hour.
      </FormNote>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id="forgot-email" label="Email">
        <TextInput
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>
      <FormError message={error} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

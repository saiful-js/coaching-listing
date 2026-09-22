"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/features/auth/client";
import { loginSchema } from "@/features/auth/schemas";
import { captchaHeaders, Field, FormError, TextInput } from "./form-fields";

export function LoginForm({
  googleEnabled,
  captchaToken,
}: {
  googleEnabled: boolean;
  /** Turnstile token once the widget is provisioned; omitted until then. */
  captchaToken?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      setError("Enter a valid email address and your password.");
      return;
    }
    setPending(true);
    await authClient.signIn.email(
      { ...parsed.data, callbackURL: "/" },
      {
        ...captchaHeaders(captchaToken),
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Could not log you in.");
          setPending(false);
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
        <Field id="login-email" label="Email">
          <TextInput
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field id="login-password" label="Password">
          <TextInput
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      {googleEnabled && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/" })
          }
        >
          Continue with Google
        </button>
      )}
    </div>
  );
}

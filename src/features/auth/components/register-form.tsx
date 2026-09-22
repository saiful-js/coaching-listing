"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/features/auth/client";
import { registerSchema } from "@/features/auth/schemas";
import { captchaHeaders, Field, FormError, TextInput } from "./form-fields";

export function RegisterForm({
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
    const parsed = registerSchema.safeParse({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      setError(
        "Check your details: name (2+ characters), a valid email, and a password of 8+ characters.",
      );
      return;
    }
    setPending(true);
    await authClient.signUp.email(
      { ...parsed.data, callbackURL: "/verify-email?verified=1" },
      {
        ...captchaHeaders(captchaToken),
        onSuccess: () => {
          router.push("/verify-email");
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Could not create your account.");
          setPending(false);
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field id="register-name" label="Full name">
          <TextInput
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Your name"
          />
        </Field>
        <Field id="register-email" label="Email">
          <TextInput
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field id="register-password" label="Password (8+ characters)">
          <TextInput
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
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

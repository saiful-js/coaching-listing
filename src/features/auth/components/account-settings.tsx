"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/features/auth/client";
import {
  Field,
  FormError,
  FormNote,
  TextInput,
} from "@/features/auth/components/form-fields";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/features/auth/schemas";

/**
 * Account settings (owner dashboard). Name + password via the Better Auth
 * client; email verification status surfaces the existing resend flow.
 */
export function AccountSettings({
  name,
  email,
  emailVerified,
}: {
  name: string;
  email: string;
  emailVerified: boolean;
}) {
  const router = useRouter();

  const [profilePending, setProfilePending] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNote, setProfileNote] = useState<string | null>(null);

  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

  async function onProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileNote(null);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const parsed = updateProfileSchema.safeParse({
      name: String(form.get("name") ?? ""),
    });
    if (!parsed.success) {
      setProfileError(
        parsed.error.issues[0]?.message ?? "Enter your name (2+ characters).",
      );
      return;
    }
    setProfilePending(true);
    await authClient.updateUser(
      { name: parsed.data.name },
      {
        onSuccess: () => {
          setProfileNote("Name updated.");
          setProfilePending(false);
          router.refresh();
        },
        onError: (ctx) => {
          setProfileError(ctx.error.message || "Could not update your name.");
          setProfilePending(false);
        },
      },
    );
  }

  async function onPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNote(null);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword: String(form.get("newPassword") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    });
    if (!parsed.success) {
      setPasswordError(
        parsed.error.issues[0]?.message ??
          "Check your current password and the new one (8+ characters).",
      );
      return;
    }
    setPasswordPending(true);
    await authClient.changePassword(
      {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      {
        onSuccess: () => {
          formEl.reset();
          setPasswordNote("Password changed. Other devices were signed out.");
          setPasswordPending(false);
        },
        onError: (ctx) => {
          setPasswordError(ctx.error.message || "Could not change password.");
          setPasswordPending(false);
        },
      },
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-sm border border-line bg-paper-raised p-5">
        <h2 className="font-display text-lg font-medium">Profile</h2>
        <form onSubmit={onProfileSubmit} className="grid max-w-md gap-4">
          <Field id="account-name" label="Your name">
            <TextInput
              id="account-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={name}
            />
          </Field>
          <FormError message={profileError} />
          {profileNote && <FormNote>{profileNote}</FormNote>}
          <button
            type="submit"
            className="btn btn-primary h-10 justify-self-start px-5 text-sm"
            disabled={profilePending}
          >
            {profilePending ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-sm border border-line bg-paper-raised p-5">
        <h2 className="font-display text-lg font-medium">Email</h2>
        <p className="text-sm text-ink">
          <span className="font-mono">{email}</span>{" "}
          {emailVerified ? (
            <span className="rounded-sm border border-forest bg-forest-tint px-2 py-0.5 font-mono text-xs text-forest">
              Verified
            </span>
          ) : (
            <span className="rounded-sm border border-clay bg-clay-tint px-2 py-0.5 font-mono text-xs text-clay">
              Not verified
            </span>
          )}
        </p>
        {emailVerified ? (
          <p className="text-sm text-ink-soft">
            Your email is confirmed — you can submit listings for review.
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm text-ink-soft">
              You can draft listings, but not submit them for review until your
              email is verified. Send yourself a new link:
            </p>
            <div className="max-w-md">
              <ResendVerificationForm />
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-sm border border-line bg-paper-raised p-5">
        <h2 className="font-display text-lg font-medium">Password</h2>
        <form onSubmit={onPasswordSubmit} className="grid max-w-md gap-4">
          <Field id="account-current-password" label="Current password">
            <TextInput
              id="account-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field id="account-new-password" label="New password (8+ characters)">
            <TextInput
              id="account-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field id="account-confirm-password" label="Confirm new password">
            <TextInput
              id="account-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <FormError message={passwordError} />
          {passwordNote && <FormNote>{passwordNote}</FormNote>}
          <button
            type="submit"
            className="btn btn-primary h-10 justify-self-start px-5 text-sm"
            disabled={passwordPending}
          >
            {passwordPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}

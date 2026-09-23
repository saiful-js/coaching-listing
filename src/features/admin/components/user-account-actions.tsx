"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  banUserAction,
  markEmailVerifiedAction,
  resendVerificationAction,
  sendPasswordResetAction,
  setUserRoleAction,
  unbanUserAction,
} from "@/features/admin/actions";
import { FormError } from "@/features/auth";

type Pending =
  | "verification"
  | "reset"
  | "verified"
  | "role"
  | "ban"
  | "unban"
  | null;

export interface AccountUser {
  id: string;
  role: "OWNER" | "ADMIN";
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
}

export function UserAccountActions({
  user,
  isSelf,
}: {
  user: AccountUser;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [role, setRole] = useState(user.role);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");

  async function run(
    kind: Exclude<Pending, null>,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) {
    setPending(kind);
    setError(null);
    setNote(null);
    const result = await fn();
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setPending(null);
      return;
    }
    setNote(success);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="grid gap-5 rounded-sm border border-line bg-paper-raised p-5">
      <h3 className="font-display text-lg font-medium">Account actions</h3>
      {note && (
        <p aria-live="polite" className="text-sm text-forest">
          {note}
        </p>
      )}
      <FormError message={error} />

      <section className="grid gap-2">
        <h4 className="font-mono text-xs tracking-wide text-ink-faint uppercase">
          Support
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={pending !== null}
            onClick={() =>
              run(
                "verification",
                () => resendVerificationAction(user.id),
                "Verification link sent (if the address is deliverable).",
              )
            }
          >
            {pending === "verification" ? "Sending…" : "Resend verification"}
          </button>
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={pending !== null}
            onClick={() =>
              run(
                "reset",
                () => sendPasswordResetAction(user.id),
                "Password reset link sent.",
              )
            }
          >
            {pending === "reset" ? "Sending…" : "Send password reset"}
          </button>
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={pending !== null}
            onClick={() =>
              run(
                "verified",
                () => markEmailVerifiedAction(user.id, !user.emailVerified),
                user.emailVerified
                  ? "Marked as unverified."
                  : "Marked as verified.",
              )
            }
          >
            {pending === "verified"
              ? "Saving…"
              : user.emailVerified
                ? "Mark unverified"
                : "Mark verified"}
          </button>
        </div>
      </section>

      <section className="grid gap-2 border-t border-line pt-4">
        <h4 className="font-mono text-xs tracking-wide text-ink-faint uppercase">
          Role
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="account-role" className="sr-only">
            Role
          </label>
          <select
            id="account-role"
            value={role}
            disabled={isSelf || pending !== null}
            onChange={(event) =>
              setRole(event.target.value as "OWNER" | "ADMIN")
            }
            className="h-9 rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
          >
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary h-9 px-4 text-[13px]"
            disabled={isSelf || pending !== null || role === user.role}
            onClick={() =>
              run(
                "role",
                () => setUserRoleAction(user.id, role),
                `Role changed to ${role}.`,
              )
            }
          >
            {pending === "role" ? "Saving…" : "Save role"}
          </button>
          {isSelf && (
            <span className="text-xs text-ink-faint">
              You cannot change your own role.
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-2 border-t border-line pt-4">
        <h4 className="font-mono text-xs tracking-wide text-ink-faint uppercase">
          Suspension
        </h4>
        {user.banned ? (
          <div className="grid gap-2">
            <p className="text-sm text-ink">
              <span className="rounded-sm border border-clay bg-clay-tint px-2 py-0.5 font-mono text-xs text-clay">
                Suspended
              </span>{" "}
              {user.banReason ?? "No reason recorded."}
              {user.banExpires && (
                <span className="text-ink-soft">
                  {" "}
                  · lifts {user.banExpires.slice(0, 10)}
                </span>
              )}
            </p>
            <button
              type="button"
              className="btn btn-secondary h-9 justify-self-start px-4 text-[13px]"
              disabled={pending !== null}
              onClick={() =>
                run(
                  "unban",
                  () => unbanUserAction(user.id),
                  "Suspension lifted.",
                )
              }
            >
              {pending === "unban" ? "Lifting…" : "Lift suspension"}
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            <label
              htmlFor="ban-reason"
              className="text-sm font-medium text-ink"
            >
              Reason
            </label>
            <textarea
              id="ban-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Why is this account being suspended?"
              className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2 text-sm text-ink"
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <label
                  htmlFor="ban-days"
                  className="text-sm font-medium text-ink"
                >
                  Days (blank = permanent)
                </label>
                <input
                  id="ban-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  className="h-9 w-32 rounded-sm border border-line-strong bg-paper px-3 text-sm text-ink"
                />
              </div>
              <button
                type="button"
                className="btn btn-danger h-9 px-4 text-[13px]"
                disabled={pending !== null || reason.trim().length === 0}
                onClick={() =>
                  run(
                    "ban",
                    () =>
                      banUserAction(
                        user.id,
                        reason.trim(),
                        days ? Number(days) : null,
                      ),
                    "Account suspended and sessions revoked.",
                  )
                }
              >
                {pending === "ban" ? "Suspending…" : "Suspend account"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

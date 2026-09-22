import { env } from "@/lib/env";

/**
 * Cloudflare Turnstile check for register / password-reset (PRD §10).
 *
 * Dev stub until Turnstile is provisioned (user-approved 2026-09-22): with
 * no `TURNSTILE_SECRET_KEY`, the check passes outside production so local
 * and test journeys work, and fails closed in production so the app can
 * never be deployed open by accident. A missing/empty token always fails.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) {
    return false;
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    return env.NODE_ENV !== "production";
  }
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}

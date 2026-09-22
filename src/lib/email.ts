import { env } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outgoing mail (M2, PRD FR-1).
 *
 * Dev stub until Resend is provisioned (user-approved 2026-09-22): every
 * message is recorded in `emailOutbox` so the verify/reset journeys are
 * testable without an email account. When `RESEND_API_KEY` is set, the
 * message is additionally delivered via the Resend HTTP API (no extra
 * dependency). The sender domain is a placeholder until provisioning.
 */
export const emailOutbox: OutgoingEmail[] = [];

export function clearEmailOutbox(): void {
  emailOutbox.length = 0;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  emailOutbox.push(email);
  if (!env.RESEND_API_KEY) {
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Coaching NGJ <noreply@example.com>",
      to: email.to,
      subject: email.subject,
      text: email.text,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Resend delivery failed with status ${response.status} to ${email.to}`,
    );
  }
}

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outgoing mail (M2, PRD FR-1; Gmail SMTP per ADR 0003).
 *
 * Dev stub while `SMTP_USER`/`SMTP_PASS` are unset: every message is
 * recorded in `emailOutbox` so the verify/reset journeys are testable
 * without a mail account. When configured, the message is delivered via
 * Gmail SMTP (nodemailer) and retained nowhere — tokens must not pile up
 * in server memory.
 */
export const emailOutbox: OutgoingEmail[] = [];

export function clearEmailOutbox(): void {
  emailOutbox.length = 0;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    emailOutbox.push(email);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM ?? `Coaching NGJ <${env.SMTP_USER}>`,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
  } catch (error) {
    // Never leak the recipient (or SMTP internals) to the caller.
    console.error("SMTP delivery failed");
    throw new Error("Could not send email. Try again later.", {
      cause: error,
    });
  }
}

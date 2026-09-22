# 0003 — Gmail SMTP over Resend for transactional mail

- **Date:** 2026-09-22
- **Status:** Accepted (requested by Saiful)

## Context

PRD §11 named Resend for verification/reset mail. The project has a Gmail
account available, and Gmail SMTP covers MVP volumes with no extra vendor.

## Decision

Send via Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) with `nodemailer`,
authenticated by a Google App Password (`SMTP_USER` + `SMTP_PASS`).
`src/lib/email.ts` keeps the keyless dev-outbox stub; `src/lib/env.ts`
requires the SMTP credentials at production boot.

## Consequences

- New runtime dependency: `nodemailer` (+ `@types/nodemailer` dev).
  Requested directly by the owner, so no separate approval step.
- Gmail caps (~500 mails/day) and deliverability are fine for an MVP
  directory; revisit if volume or spam-folder placement demands it.
- Setup need: Google account with 2-Step Verification → App Password
  (myaccount.google.com/apppasswords). Never the account password.
- `SMTP_FROM` optional; defaults to `Coaching NGJ <SMTP_USER>`.

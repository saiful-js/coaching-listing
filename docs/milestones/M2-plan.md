# M2 — Auth: short implementation plan (PRD §14.2)

- **Date:** 2026-09-22 · Branch `feat/m2-auth` · Worktree `.worktrees/m2-auth`
- **Source:** `docs/plan.md` M2 + `docs/PRD.md` FR-1/§10 · **Decisions:** dev stubs for Resend/Turnstile/Google (user-approved 2026-09-22); R2 deferred to M4.
- **Docs consulted:** Better Auth (Context7, 2026-09-22): `emailAndPassword` + `emailVerification.sendVerificationEmail` + `sendResetPassword`, `socialProviders.google` (env-gated), `toNextJsHandler(auth)` route, `auth.api.getSession({ headers })` server guard. Next.js 16 route types via `next typegen` (verified in-worktree).

## New dependencies: NONE
No `resend`, no Turnstile widget package, no Playwright. Rationale: stubs keep M2 shippable without account provisioning or new supply-chain; E2E journey is covered by integration tests against the real Better Auth handler + DB (Playwright install deferred to M5 with justification then). If the mailer grows, `resend` approval is requested at provisioning time.

## Tasks (TDD, in order)

| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | M2 env shape: optional `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `GOOGLE_CLIENT_ID/SECRET` (all optional in dev, fail-loud only when the gated feature is used without them) | `src/lib/env.ts`, `tests/unit/env.test.ts`, `.env.example` | `vitest run tests/unit/env.test.ts` |
| 2 | DB-backed rate limiter (`RateLimitHit` model + migration) | `prisma/schema.prisma`, `prisma/migrations/*`, `src/lib/rate-limit.ts`, `tests/unit/rate-limit.test.ts` | `vitest run tests/unit/rate-limit.test.ts` |
| 3 | Auth config: verification + reset via stub mail outbox, Google gated by env, `requireEmailVerification: false` (PRD: unverified can log in, cannot submit — submission enforced M3) | `src/lib/auth.ts`, `src/lib/email.ts` (stub outbox), `src/lib/turnstile.ts` (stub verify), Prisma CLI regen diff + migration if needed | `tsc`, regen diff review |
| 4 | Server guards | `src/lib/auth-helpers.ts` (`requireUser`, `requireAdmin`, `requireOwnerOf`), `tests/unit/auth-helpers.test.ts` | `vitest run tests/unit/auth-helpers.test.ts` |
| 5 | Auth API route | `src/app/api/auth/[...all]/route.ts` | `tsc`, handler smoke test |
| 6 | Auth pages (server-first, thin; no business logic in routes) | `src/app/(auth)/login|register|forgot-password|reset-password|verify-email/*`, `src/features/auth/*` (schemas via shared Zod, client component only for forms) | `biome`, `tsc`, `next build` |
| 7 | Journey proof: register→verify→login→logout integration vs real handler+DB; wrong-password ×6 → 429; reset token single-use + expiring | `tests/integration/auth-journey.test.ts` (+ vitest include update) | `vitest run tests/integration/auth-journey.test.ts` |

## DoD (docs/plan.md M2)
E2E-equivalent journey green; wrong-password ×6 → rate-limited; tokens single-use + expiring; `biome check` ✓ · `tsc` ✓ · `vitest run` ✓ · `next build` ✓. Stop and summarize.

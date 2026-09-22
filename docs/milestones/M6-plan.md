# M6 — Admin moderation: short implementation plan (PRD §14.2)

- **Date:** 2026-09-22 · Branch `main` (direct, per user preference)
- **Source:** `docs/plan.md` M6 + `docs/PRD.md` FR-6/§5.

## New dependencies: NONE

## Design

- `/admin` layout guards everything with `requireAdmin()` (401 → `/login`, 403 → `/`).
- `/admin/listings?status=PENDING` queue: status tabs, owner + area + updated
  per row; Approve / Reject (reason required, inline form) / Unpublish —
  all via new thin actions calling the existing `service.ts` transitions
  (approve/reject/unpublish already tested in M3).
- Minimal taxonomy management: list + create areas/categories (slug from
  `nameEn`, unique-checked). No rename/delete in M6 (FK risk; ledgered).
- Tests: `tests/integration/admin-moderation.test.ts` — visibility per
  transition via `listPublished`, audit row per transition, non-admin
  forbidden, taxonomy create/duplicate/forbidden.

## Tasks (TDD, in order)

| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | Moderation + taxonomy tests (RED) | `tests/integration/admin-moderation.test.ts` | vitest fails on missing actions |
| 2 | Admin listing actions + taxonomy actions | `features/listings/actions.ts`, `features/admin/*` | vitest GREEN |
| 3 | Admin UI (layout, queue, taxonomy) | `app/admin/**` | tsc/build |
| 4 | DoD proof + note | full suite, build, `docs/milestones/M6.md` | — |

## DoD
No unreviewed listing ever publicly visible (tested); every transition writes an audit row (tested); `biome` ✓ · `tsc` ✓ · `vitest` ✓ · `next build` ✓. Stop and summarize.

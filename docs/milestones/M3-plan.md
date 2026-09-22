# M3 — Owner listings (no images): short implementation plan (PRD §14.2)

- **Date:** 2026-09-22 · Branch `main` (direct, per user preference — no worktree)
- **Source:** `docs/plan.md` M3 + `docs/PRD.md` FR-2/FR-3/§5/§8 · Unverified-submit gate uses `SessionUser.emailVerified` (M2-ready).

## New dependencies: NONE
No `react-hook-form` (forms continue the M2 FormData+Zod pattern — fewer deps, same server-truth guarantee), no `nuqs` (M5), no shadcn (M0 custom system; clay tokens reserved for badges).

## Status machine (service.ts is the ONLY status writer)

| Transition | Who | Note |
|---|---|---|
| DRAFT→PENDING (submit) | owner, verified email only | max 5 active listings enforced here |
| REJECTED→PENDING (resubmit) | owner, verified email only | |
| PENDING→PUBLISHED (approve) | admin | sets `publishedAt` |
| PENDING→REJECTED (reject) | admin | reason required |
| PUBLISHED→ARCHIVED (archive/unpublish) | owner or admin | note optional |
| DRAFT→ARCHIVED (archive) | owner | abandon a draft |
| edit | owner in DRAFT/REJECTED/PENDING (status kept), PUBLISHED (stays live, A4); admin any | slug immutable |

Every transition writes `ListingAuditLog`. Cross-owner ids → 404 (requireOwnerOf). Slug: `slugify(name) || "coaching"` + `-` + 6 chars, once. Images: submit requires fields only — cover-required rule lands in M4 with uploads.

## Tasks (TDD, in order)

| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | Schemas + phone normalize + slug | `features/listings/schemas.ts`, `phone.ts`, `slug.ts`, `tests/unit/listings-*.test.ts` | vitest unit |
| 2 | Pure policies matrix | `features/listings/policies.ts`, `tests/unit/listing-policies.test.ts` | vitest unit |
| 3 | Service (CRUD + transitions + audit) | `features/listings/service.ts`, `tests/integration/listings-service.test.ts` | vitest integration |
| 4 | Server Actions (thin) | `features/listings/actions.ts` | tsc |
| 5 | Dashboard pages + forms | `app/dashboard/**`, `features/listings/components/*`, header link | biome/tsc/build |
| 6 | DoD proof + note | full suite, build, `docs/milestones/M3.md` | 404 test, matrix test |

## DoD
Owner cannot touch others' listings (tested); cross-owner id → 404; `biome` ✓ · `tsc` ✓ · `vitest` ✓ · `next build` ✓. Stop and summarize.

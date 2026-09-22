# M4 — Images (Cloudinary): short implementation plan (PRD §14.2)

- **Date:** 2026-09-22 · Branch `main` (direct, per user preference)
- **Source:** `docs/plan.md` M4 + `docs/PRD.md` FR-3/§9 · **Architecture:** ADR 0004 (Cloudinary server-side upload replaces R2 presigned-PUT; `browser-image-compression` gate dropped — Cloudinary transforms instead).

## New dependencies: `cloudinary` (owner-requested, installed)

## Design

- Server-side upload via Server Actions (`features/uploads`): browser posts
  the file → ownership + type (jpeg/png/webp) + size (≤5 MB, A7) + count
  (≤6 total: 1 cover + 5 gallery) checks → `uploader.upload` into
  `coachings/{coachingId}/` with `w_1600,c_limit,f_auto,q_auto` →
  `CoachingImage` row (`key` = `public_id`, still a key per PRD §7).
- `next/image` serves delivery URLs built from `CLOUDINARY_CLOUD_NAME`;
  `next.config.ts` `remotePatterns` locked to `res.cloudinary.com`.
- `submitForReview` gains the cover-required check (PRD FR-3; deferred from
  M3) — M3 service tests updated to attach covers before submit.
- Missing creds → loud use-time error; production boot requires all three
  `CLOUDINARY_*` keys (same posture as mail/Turnstile).

## Tasks (TDD, in order)

| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | Env: `CLOUDINARY_*` optional + prod gate | `lib/env.ts`, `tests/unit/env.test.ts` | vitest |
| 2 | Upload module (mocked SDK) | `features/uploads/*`, `tests/unit/uploads.test.ts` | vitest |
| 3 | DB integration (mocked SDK): rows, cover uniqueness, abuse cases | `tests/integration/uploads.test.ts` | vitest |
| 4 | Actions + uploader/gallery UI + `remotePatterns` | `features/uploads/actions.ts`, components, `next.config.ts` | tsc/build |
| 5 | Cover-required submit + M3 test updates | `features/listings/service.ts`, M3 tests | vitest |
| 6 | DoD proof + note | full suite, build, `docs/milestones/M4.md` | — |

## DoD
Upload/replace/delete works; abuse cases (unauthed, not-owner, over-limit, bad type) rejected and tested. Real end-to-end needs user credentials (requested at the end).

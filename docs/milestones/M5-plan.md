# M5 — Public pages: short implementation plan (PRD §14.2)

- **Date:** 2026-09-22 · Branch `main` (direct, per user preference)
- **Source:** `docs/plan.md` M5 + `docs/PRD.md` FR-4/FR-5/§8/§10.

## New dependencies: NONE
No `nuqs` — filters use native GET forms + `searchParams` (zero client JS,
crawlable URLs, same shareable-query guarantee). Rationale recorded below.

## Design

- `features/listings/queries.ts` (server-only): `listPublished({q,
  areaSlug, categorySlug, page})` (12/page, `publishedAt desc, id desc`,
  case-insensitive contains over name/address/description), `getPublishedBySlug`
  (null unless PUBLISHED), `getAreaWithListings(slug)`, `latestPublished(n)`,
  `allAreasWithCounts`. Card selects only: id/slug/name/area/description
  excerpt/cover.
- Pages (all Server Components, no client JS on public routes):
  - `/` — search box (GET → /coachings), area chips (DB + counts), latest 6.
  - `/coachings` — filter form (q/area/category, GET), paginated cards,
    empty state + "clear filters", `loading.tsx`/`error.tsx`.
  - `/coachings/[slug]` — full detail, gallery, `tel:`/`wa.me`, plain-text
    `whitespace-pre-line`, `not-found.tsx` for non-published.
  - `/areas/[slug]` — SEO landing ("Coaching centres in {Area}").
- Shared `ListingCard` (server) with cover via `cloudinaryUrl` + next/image.
- Bengali-capable type: Hind Siliguri via `next/font` (`--font-content`
  utility) applied to user-entered content (names, descriptions, areas).
- Metadata: plain title/description per page (canonical/OG/JSON-LD stay M7).

## Tasks (TDD, in order)

| # | Task | Files | Verification |
|---|------|-------|--------------|
| 1 | Queries + visibility/ordering/pagination/search tests | `features/listings/queries.ts`, `tests/integration/listing-queries.test.ts` | vitest |
| 2 | Card + `/coachings` list + filters + states | `components/listing-card.tsx`, `app/coachings/**` | tsc/build |
| 3 | Detail page + 404 | `app/coachings/[slug]/page.tsx` | tsc/build |
| 4 | Home (data-driven) + area pages | `app/page.tsx`, `app/areas/[slug]/page.tsx` | tsc/build |
| 5 | Font + DoD proof + note | layout, globals, full suite, build, `docs/milestones/M5.md` | — |

## DoD
Filters shareable in URL; only PUBLISHED visible (tested); empty/error/loading states; `biome` ✓ · `tsc` ✓ · `vitest` ✓ · `next build` ✓. Perf targets (LCP/CLS/INP on a device profile) cannot be measured in this environment — best-effort (static + sized images + zero JS) with real measurement deferred to M7 PageSpeed pass.

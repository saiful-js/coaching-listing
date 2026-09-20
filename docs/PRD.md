# PRD — Narayanganj Coaching Directory

**Working name:** `coaching-ngj`
**Version:** 0.1 (draft, ready for implementation)
**Audience:** AI coding agent + human reviewer (Saiful)

---

## 1. Summary

A public web directory where students and parents find coaching centers in **Narayanganj**. Coaching owners register, log in, and create/manage their own listing. Every listing is reviewed by an admin before it becomes public.

The product is a **search-engine-driven directory**. People will arrive from Google ("coaching center in Fatullah"), so SEO, mobile speed, and Bangla text support are first-class requirements, not polish.

## 2. Goals and non-goals

### Goals

- G1. Public listing pages are indexable and fast on mobile 4G.
- G2. An owner can register and publish a listing in under 5 minutes from a phone.
- G3. No unreviewed listing is ever publicly visible.
- G4. Only the owner of a listing (or an admin) can change it. Enforced on the server.
- G5. Cheap and simple to run: one deployable app, one database, one bucket.

### Non-goals (MVP — do NOT build)

Reviews/ratings, payments, featured/paid listings, online admission/booking, chat, owner analytics, mobile app, multiple districts/city selector, Elasticsearch/OpenSearch, Redis, queues, microservices, GraphQL.

## 3. Assumptions (confirm before building; each is cheap to change now, expensive later)

| #  | Assumption                                                                                                                                                                                    | If wrong                          |
|----|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| A1 | "Narayanganj" means the whole district, filtered by **area** (Narayanganj Sadar, Fatullah, Siddhirganj, Bandar, Sonargaon, Rupganj, Araihazar). Area list is DB-seeded and admin-editable.       | Change the seed data only.        |
| A2 | Location is **fixed** to Narayanganj. No city selector in the UI. The server rejects any area not in the Area table.                                                                            | Add a `District` table later.     |
| A3 | Admin approval required before a listing is public.                                                                                                                                            | Change default status to `PUBLISHED`. |
| A4 | Owner edits to a published listing go live immediately; admin can unpublish at any time.                                                                                                       | Add re-review flow later.         |
| A5 | Auth = email + password (with email verification) and Google sign-in. Phone OTP is out of MVP (SMS cost).                                                                                      | Add phone plugin later.           |
| A6 | UI is bilingual (Bangla default, English). User-entered content can be in either language.                                                                                                     | If English-only, skip next-intl. **Decide before Milestone 1**, retrofitting i18n is painful. |
| A7 | Per listing: 1 cover + up to 5 gallery images, max 5 MB each before compression. Per owner: max 5 listings.                                                                                     | Config constants.                 |
| A8 | One seeded admin account (via env/seed script). No admin signup UI.                                                                                                                            | —                                 |

## 4. Roles and permissions

| Action                                        | Visitor | Owner (logged in) | Admin |
|-----------------------------------------------|:-------:|:-----------------:|:-----:|
| Browse/search published listings              | ✅      | ✅                | ✅    |
| View a listing detail (published)             | ✅      | ✅                | ✅    |
| View own non-published listing                | ❌      | ✅ (own only)     | ✅    |
| Create listing                                | ❌      | ✅ (up to limit)  | ✅    |
| Edit / archive own listing                    | ❌      | ✅ (own only)     | ✅ (any) |
| Approve / reject / unpublish                  | ❌      | ❌                | ✅    |
| Manage areas/categories                       | ❌      | ❌                | ✅    |

## 5. Listing lifecycle

```
DRAFT ──submit──▶ PENDING ──approve──▶ PUBLISHED ──archive──▶ ARCHIVED
                     │                     │
                     └──reject(reason)──▶ REJECTED ──edit+resubmit──▶ PENDING
                                           PUBLISHED ──admin unpublish──▶ REJECTED/ARCHIVED
```

Only `PUBLISHED` listings appear in public pages, sitemap, and search. Status transitions are enforced in a single service function; no other code may write `status`.

## 6. Functional requirements

### FR-1 Authentication

- Register (name, email, password), email verification, login, logout, forgot/reset password, Google OAuth.
- Session in HTTP-only, Secure, SameSite=Lax cookie (managed by Better Auth).
- Unverified users can log in but cannot submit a listing for review.
- **AC:** wrong password 6+ times in a short window → rate-limited. Passwords never logged. Reset tokens are single-use and expire.

### FR-2 Owner dashboard

- `/dashboard` lists the owner's listings with status badges and rejection reason if any.
- Create / edit / archive listing. Submit for review.
- **AC:** an owner requesting another owner's listing id gets 404 (not 403, to avoid leaking existence).

### FR-3 Listing form (fields)

| Field              | Rules                                                                                                                                    |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Coaching name      | required, 3–120 chars, Bangla or English                                                                                                  |
| Area               | required, must exist in Area table (Narayanganj only)                                                                                     |
| Address            | required, 5–250 chars (street/holding/road/landmark text)                                                                                 |
| Details            | required, 30–5000 chars, **plain text only** (render with `whitespace-pre-line`; no HTML/Markdown in MVP)                                 |
| Categories         | 1–5 from Category table (e.g. Class 1–5, Class 6–8, SSC, HSC, Admission, English Medium, IELTS/Spoken English, ICT/Programming)           |
| Contact phone      | required, Bangladeshi mobile, normalized to `+8801XXXXXXXXX` (regex on input: `^(?:\+?88)?01[3-9]\d{8}$`)                                 |
| WhatsApp           | optional, same rule                                                                                                                       |
| Email              | optional                                                                                                                                  |
| Facebook page URL  | optional, must be `https://` and host `facebook.com` or `fb.com`                                                                          |
| Images             | 1 cover (required to submit) + up to 5 gallery, JPEG/PNG/WebP                                                                             |

- Validation with one shared Zod schema used by the form and the server action. **Server validation is the source of truth.**
- Slug is generated once at creation: `slugify(name) || "coaching"` + `-` + 6 random chars. Slug never changes afterward (URL stability).

### FR-4 Public browse and search

- `/coachings`: paginated list (12/page), filters: `q` (text), `area`, `category`. Filters live in the URL query string (shareable, indexable).
- Text search: case-insensitive `contains` across name, address, details. **Do not add pg_trgm/full-text yet.** Measure first. (Bangla + pg_trgm behavior must be tested before ever adopting it.)
- Ordering: `publishedAt desc, id desc` (stable). Offset pagination is fine for MVP and gives crawlable page numbers.
- **AC:** empty result shows an empty state with a "clear filters" action.

### FR-5 Listing detail page

- `/coachings/[slug]`: name, area, address, details, categories, image gallery, click-to-call (`tel:`) and WhatsApp (`https://wa.me/…`) buttons.
- 404 for anything not `PUBLISHED` (owner/admin preview happens in the dashboard, not the public URL).
- JSON-LD structured data (`LocalBusiness`/`EducationalOrganization`), Open Graph image = cover.

### FR-6 Admin moderation

- `/admin/listings?status=PENDING`: queue, view, approve, reject with reason.
- Admin can unpublish any listing.
- **AC:** every status change writes a row to `ListingAuditLog` (who, when, from, to, note).

### FR-7 SEO

- Per-page metadata, canonical URLs, `sitemap.xml` (published listings + area pages), `robots.txt` (disallow `/dashboard`, `/admin`, `/api`).
- Area landing pages `/areas/[slug]` ("Coaching centers in Fatullah") with unique title/description and the filtered list. This is the main organic-traffic surface.
- Semantic HTML, one `h1` per page.

### FR-8 Bangla/English UI (per assumption A6)

- `next-intl`, locales `bn` (default) and `en`; `hreflang` alternates.
- Load a Bengali-capable font (Noto Sans Bengali or Hind Siliguri) via `next/font`.

## 7. Data model (Prisma draft)

> Generator/datasource config, Better Auth tables (`User`, `Session`, `Account`, `Verification`), and the `role` field on User must be created following the **current** Prisma and Better Auth docs (use the Better Auth CLI to generate its schema). Do not hand-write them from memory.

```prisma
enum ListingStatus {
  DRAFT
  PENDING
  PUBLISHED
  REJECTED
  ARCHIVED
}

model Area {
  id        String     @id @default(cuid())
  slug      String     @unique
  nameEn    String
  nameBn    String
  sortOrder Int        @default(0)
  coachings Coaching[]
}

model Category {
  id        String     @id @default(cuid())
  slug      String     @unique
  nameEn    String
  nameBn    String
  sortOrder Int        @default(0)
  coachings Coaching[]
}

model Coaching {
  id              String        @id @default(cuid())
  slug            String        @unique
  ownerId         String        // FK -> User.id (Better Auth user table)
  name            String        @db.VarChar(120)
  description     String        @db.Text
  areaId          String
  area            Area          @relation(fields: [areaId], references: [id])
  addressLine     String        @db.VarChar(250)
  phone           String        @db.VarChar(16)   // +8801XXXXXXXXX
  whatsapp        String?       @db.VarChar(16)
  email           String?
  facebookUrl     String?
  categories      Category[]
  images          CoachingImage[]
  status          ListingStatus @default(DRAFT)
  rejectionReason String?
  publishedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Public list query: WHERE status='PUBLISHED' [AND areaId=?] ORDER BY publishedAt DESC
  @@index([status, areaId, publishedAt(sort: Desc)])
  // Owner dashboard query
  @@index([ownerId, status])
}

model CoachingImage {
  id         String   @id @default(cuid())
  coachingId String
  coaching   Coaching @relation(fields: [coachingId], references: [id], onDelete: Cascade)
  key        String   @unique   // object-storage key, NOT a full URL
  width      Int
  height     Int
  isCover    Boolean  @default(false)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())

  @@index([coachingId, sortOrder])
}

model ListingAuditLog {
  id         String        @id @default(cuid())
  coachingId String
  actorId    String
  fromStatus ListingStatus
  toStatus   ListingStatus
  note       String?
  createdAt  DateTime      @default(now())

  @@index([coachingId, createdAt])
}
```

Rules:

- Store object **keys**, never full URLs. The public base URL is config (allows changing CDN/domain without a data migration).
- Exactly one `isCover = true` per listing (enforce in service; optionally a partial unique index in a raw SQL migration).
- All schema changes go through `prisma migrate dev` locally and `prisma migrate deploy` in CI/production. Never edit the production DB by hand.

## 8. Routes

| Route                                                                | Type           | Notes                       |
|----------------------------------------------------------------------|----------------|-----------------------------|
| `/`                                                                  | public         | search box, area chips, latest listings |
| `/coachings`                                                         | public         | list + filters via query string |
| `/coachings/[slug]`                                                  | public         | detail                      |
| `/areas/[slug]`                                                      | public         | SEO landing page            |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | public |                             |
| `/dashboard`                                                         | owner          | my listings                 |
| `/dashboard/listings/new`, `/dashboard/listings/[id]/edit`           | owner          | form                        |
| `/admin/listings`                                                    | admin          | moderation queue            |
| `/api/auth/[...all]`                                                 | handler        | Better Auth                 |
| `/api/uploads/presign`                                               | handler        | authenticated presigned PUT URL |
| `/sitemap.xml`, `/robots.txt`                                        | metadata routes|                             |

Mutations use **Server Actions** (create/update/submit/archive, approve/reject). Route Handlers only for auth, presign, and anything an external client must call.

## 9. Image upload flow

R2 supports presigned **PUT** URLs (not POST policies), so size/type cannot be enforced by the URL alone. Therefore defense is layered:

1. Client resizes to max 1600 px on the long edge and converts to WebP (`browser-image-compression`).
2. Client calls `POST /api/uploads/presign` `{ coachingId, contentType, size }`. Server: requires session, verifies ownership, checks limits (count, type ∈ jpeg/png/webp, size ≤ 5 MB), returns `{ uploadUrl, key }` with key `coachings/{coachingId}/{random}.webp` and a short expiry (≈5 min).
3. Client `PUT`s the file directly to the bucket (bucket CORS allows only the app origin and `PUT`).
4. On listing save, server `HeadObject`s every submitted key: must be under the listing's prefix, size ≤ limit, correct content type. Anything failing is rejected and deleted.
5. Deleting a listing/image deletes the object. A scheduled cleanup removes objects older than 24 h that are not referenced by any `CoachingImage` row (post-MVP if needed).

Images are served from a public bucket on a custom domain (e.g. `img.example.com`). Render with `next/image` (`remotePatterns` restricted to that host), always with `width`/`height` or `fill` + `sizes`, and meaningful `alt`.

## 10. Non-functional requirements

**Security**

- Authorization enforced in a server-side data-access layer: `requireUser()`, `requireOwnerOf(listingId)`, `requireAdmin()`. **Do not rely on `proxy.ts` (formerly middleware) alone** for protection; use it only for optimistic redirects. (Middleware-only auth was bypassable in CVE-2025-29927.)
- Zod validation on every server action and route handler input.
- Rate limiting on login, register, password reset, presign, listing create. Persisted store (database) because serverless instances do not share memory.
- Cloudflare Turnstile on register and password-reset request.
- Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production).
- No secrets in client bundles; only `NEXT_PUBLIC_*` values are public. Validate env at boot.
- User text is rendered as plain text (React escaping). No `dangerouslySetInnerHTML` with user data.
- Never log passwords, tokens, or full request bodies.

**Performance** (targets, verify with Lighthouse/PageSpeed on a mid-range phone profile)

- LCP < 2.5 s, CLS < 0.1, INP < 200 ms on listing and detail pages.
- Public pages use Server Components; Client Components only for forms, image uploader, gallery interactions.
- No N+1: list query uses `select` with only the fields needed by cards + cover image.
- Database in the region closest to users (Singapore) and app in the same region.

**Accessibility:** labels on all inputs, visible focus, keyboard-operable dialogs, error messages announced (`aria-live`), color contrast AA, `alt` text for images.

**Observability:** structured server logs, Sentry for errors (client + server), health endpoint `/api/health` (DB ping).

**Reliability:** daily automated DB backups (managed provider), a documented and **tested** restore procedure.

## 11. Technology stack (decided)

- Next.js (current stable, App Router, TypeScript strict), React, Tailwind CSS, shadcn/ui
- React Hook Form + Zod
- Better Auth (email/password, Google, email verification) with Prisma adapter
- PostgreSQL + Prisma (no TypeORM)
- Cloudflare R2 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- Resend (transactional email), Cloudflare Turnstile
- `nuqs` for URL query state, `sonner` for toasts, `next-intl` for i18n
- Vitest + Playwright, ESLint + Prettier, GitHub Actions
- Sentry

**Agent rule:** before using any API of these libraries, read the current official docs. Do not use APIs from memory. Record non-obvious choices in `docs/decisions/NNN-title.md`.

## 12. Project structure (single app, modular by feature)

```
coaching-ngj/
├── prisma/            schema.prisma, migrations/, seed.ts
├── src/
│   ├── app/           routes only (thin): layouts, pages, loading/error/not-found
│   ├── features/
│   │   ├── auth/      components, actions, schemas
│   │   ├── listings/  components, actions, queries, schemas, service.ts (status rules), policies.ts
│   │   ├── admin/
│   │   └── uploads/   presign logic, r2 client, uploader component
│   ├── components/    shared UI (shadcn/ui, layout, feedback)
│   ├── lib/           db.ts (Prisma singleton), auth.ts, env.ts, rate-limit.ts, logger.ts
│   ├── i18n/          messages/bn.json, messages/en.json
│   └── config/        constants (limits, area rules)
├── tests/             e2e (Playwright)
├── docs/              decisions/, runbook.md
├── docker-compose.yml local PostgreSQL only
└── .github/workflows/ci.yml
```

Rule: `features/*` may not import from each other's internals; cross-feature calls go through each feature's exported `index.ts`. Business rules (status transitions, limits, ownership) live in `service.ts`/`policies.ts`, not in components or route files.

## 13. Milestones and Definition of Done

| M  | Scope                                                                                             | Done when                                                    |
|----|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| M0 | Repo, Next.js app, TS strict, ESLint/Prettier, env validation, docker-compose Postgres, CI (lint, typecheck, test, build) | CI green on empty app                    |
| M1 | Prisma schema + migrations + seed (areas, categories, admin)                                        | `migrate dev` + seed run clean; schema reviewed              |
| M2 | Auth: register, verify email, login, logout, reset, Google, rate limits, Turnstile                  | E2E: register→verify→login→logout passes                     |
| M3 | Owner listing CRUD + validation + policies + audit log (no images yet)                              | Owner cannot touch others' listings (tested)                 |
| M4 | Image upload (R2 presign, client compression, HEAD verification, gallery)                           | Upload/replace/delete works; abuse cases tested              |
| M5 | Public pages: home, list+filters+pagination, detail, area pages, empty/error/loading states         | Lighthouse targets met                                       |
| M6 | Admin moderation queue + status transitions + audit                                                 | Only PUBLISHED visible publicly (tested)                     |
| M7 | SEO (metadata, sitemap, robots, JSON-LD), i18n polish, a11y pass                                    | Rich Results/PageSpeed checked                               |
| M8 | Security review, Sentry, health check, backups, runbook, deploy                                     | Production checklist below all ticked                        |

**Per-milestone DoD:** typecheck, lint, and tests pass; validation + authorization + error/loading/empty states handled; no new dependency without a written reason; migration included if schema changed; short note added to `docs/`.

**Production checklist:** validation ✅ authn ✅ authz ✅ error/empty/loading ✅ responsive ✅ a11y ✅ indexes justified ✅ rate limits ✅ headers ✅ env validated ✅ tests ✅ logs ✅ Sentry ✅ backups restored once ✅ rollback plan ✅

## 14. Agent operating rules (non-negotiable)

1. Work one milestone at a time. Stop and summarize when the milestone's DoD is met.
2. Before coding a milestone, output a short plan (files to create/change, packages needed with justification). Wait for approval if a new dependency or an architectural choice is involved.
3. Never install a package that is not listed in §11 without asking. Prefer framework built-ins.
4. Never trust the client: every server action/handler validates input (Zod) and checks authorization (`requireUser/requireOwnerOf/requireAdmin`).
5. No business logic in components or route files.
6. No `any`. If unavoidable, comment why.
7. No secrets in code, logs, or client bundles.
8. Every schema change = a Prisma migration.
9. Write tests for policies, status transitions, validation, and the critical E2E journey.
10. If docs and memory disagree, the docs win. If you are unsure, say so and ask; do not guess.

## 15. Open questions

1. Bilingual UI now or English-only first? (A6)
2. Area list: confirm the exact areas to seed.
3. Should edits to a published listing require re-approval? (A4)
4. Domain name, and is Google sign-in required at launch?
5. Who moderates: only you, or will there be more admins?

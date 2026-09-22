# 0004 — Cloudinary over Cloudflare R2 for listing images

- **Date:** 2026-09-22
- **Status:** Accepted (requested by Saiful)

## Context

PRD §9/M4 specified Cloudflare R2 with presigned PUT URLs, client-side
compression (`browser-image-compression`), and `HeadObject` verification.
R2 was never provisioned (deferred with a stub boundary).

## Decision

Store listing images in Cloudinary instead:

- Server-side upload through a Server Action (`features/uploads`): the
  browser posts the file to us, we validate (type/size/count/ownership)
  and upload via the `cloudinary` SDK into `coachings/{coachingId}/`.
- No presigned-URL dance, no CORS bucket config, no client compression
  library: Cloudinary applies the ≤1600px/WebP-lean delivery transform
  (`w_1600,c_limit,f_auto,q_auto`) at upload; `next/image` serves it.
- `CoachingImage.key` stores the Cloudinary `public_id` (still a key, not
  a URL, per PRD §7). Delivery URLs are built from `CLOUDINARY_CLOUD_NAME`.
- `next.config.ts` `remotePatterns` locked to `res.cloudinary.com`.

## Consequences

- New runtime dependency: `cloudinary` (owner-requested, so no separate
  approval step). Drops the `browser-image-compression` approval gate.
- Env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET` (never `NEXT_PUBLIC_*`; secret stays server-side).
- M4 DoD unchanged in spirit (upload/replace/delete + abuse cases tested);
  real end-to-end needs the three credentials from the Cloudinary console.

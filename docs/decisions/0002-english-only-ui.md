# 0002 — English-only UI first (defer Bangla UI chrome)

- **Date:** 2026-09-20
- **Status:** Accepted
- **Supersedes:** PRD A6 / FR-8 for the MVP

## Context

PRD A6 assumed a bilingual UI (Bangla default, English) via `next-intl`, and flags i18n as a "decide before Milestone 1" choice because retrofitting is painful. Saiful decided on 2026-09-20: **English-only UI first**.

## Decision

- The UI chrome (navigation, labels, buttons, empty states) is **English-only** for the MVP.
- `next-intl`, locale routing, and `hreflang` alternates are **out of MVP scope** (removed from the plan's M5/M7).
- **User-entered content remains Bangla-capable** and must render correctly:
  - Keep `nameEn`/`nameBn` columns on `Area` and `Category` (A1: "change the seed data only" — showing the Bangla name later is a UI change, not a migration).
  - Load a Bengali-capable font (Noto Sans Bengali or Hind Siliguri) via `next/font` from M5 onward, so listing names, addresses, and details in Bangla display properly even in the English-only UI.

## Consequences

- Less scope in M5/M7; no locale prefix in routes.
- If Bangla UI is added later: adopt `next-intl` then, translate chrome copy, add `hreflang`. Schema/seed changes are **not** required (by design here).

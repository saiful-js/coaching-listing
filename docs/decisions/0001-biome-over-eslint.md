# 0001 — Biome instead of ESLint + Prettier

- **Date:** 2026-09-20
- **Status:** Accepted
- **Supersedes:** PRD §11 ("Vitest + Playwright, ESLint + Prettier, GitHub Actions")

## Context

The PRD lists ESLint + Prettier as the lint/format toolchain. The repo, however, was scaffolded with **Biome 2.4** already installed and configured (`biome.json`, `lint` script = `biome check`, `format` script = `biome format --write`).

## Decision

Standardize on **Biome** for both linting and formatting. Do not install ESLint or Prettier.

## Consequences

- One tool, one config, faster CI; the `lint`/`format` scripts already exist.
- Deviation from PRD §11 wording is intentional and recorded here (per PRD §14 agent rule: record non-obvious choices in `docs/decisions/`).
- CI lint step runs `biome check`, not `eslint`.

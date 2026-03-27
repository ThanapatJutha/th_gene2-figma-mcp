# Usecase 2 — Discover and Convert

> **Note:** The workflow summary is already in `.github/copilot-instructions.md` section 7.
> This file provides additional detail on eligibility and heuristics.

Goal: Scan an existing page, identify component candidates, and convert them.

## Steps

1. List layers/components on target page
2. Suggest candidates (top-level reusable UI blocks)
3. Convert eligible nodes to components
4. Save/update `.figma.ts` specs for converted components
5. Save/update connections mapping

## Eligibility

- Usually convertible: `FRAME`, `GROUP`, `RECTANGLE`
- Not directly convertible: `TEXT`, already-`COMPONENT` nodes

## Candidate heuristics

- Shallow hierarchy depth
- Reusable naming patterns: card/button/header/sidebar/nav/table/chart/footer
- Repeated visual structures

## Required outputs

- `figma/components/*.figma.ts`
- `figma/app/.figma-sync/connections.json`
# Usecase 1 — Bootstrap from URL

Goal: Build a Figma component library from a URL (external or localhost).

## Prompt 1 — Build showcase app (skip for external URL)

- Use `figma/pages/showcase` as temporary capture UI.
- Scaffold Vite + React if needed.
- Install and use the exact detected library.
- Render full variant coverage (simple + complex states visible).
- Serve locally (typically `http://localhost:5173`).

Important: This step alone is not completion.

## Prompt 2 — Capture into Figma

- Capture URL into target Figma file.
- For external URLs, handle lazy-loading with full-page slow-scroll strategy.
- Poll capture status until completed.

Important: Capture alone is still not completion.

## Prompt 3 — Componentize and persist artifacts

1. Discover frames/layers in captured output
2. Promote candidates to components (consistent `Category / Variant` naming)
3. Save spec for every promoted component to `figma/components/*.figma.ts`
4. Save mappings to `figma/app/.figma-sync/connections.json`
5. Remove temporary capture layers/pages if needed

## Completion gate

Must all be true:
- Components promoted
- Spec files created/updated in `figma/components/`
- Mappings saved under `figma/app/.figma-sync`
- Work is not only in `figma/pages/showcase/`
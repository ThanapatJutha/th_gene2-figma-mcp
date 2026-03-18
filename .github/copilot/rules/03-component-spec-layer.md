# Rule 3 — Component Spec Layer

`.figma.tsx` files are **real, renderable React components** that wrap the
project's UI library. They contain visual/style code only — never business logic.

## Scope

- Figma component files: `figma/components/*.figma.tsx`
- Business logic / runtime code: `src/`

## Source of truth

1. `figma/config/figma.config.json` (project config, file key)
2. Mapping state (`connections.json`)
3. Existing `.figma.tsx` component files
4. Live Figma node data

## Required behavior

- Read matching `.figma.tsx` file before style-copy/sync
- If missing, generate a React component that imports and renders the project's
  actual UI library component with all visual variants
- Save with stable naming and deterministic structure
- No `onClick`, no `useState`, no business logic in `.figma.tsx` files

## After promotion

Every newly created Figma component must get:
1. A `.figma.tsx` React component file in `figma/components/`
2. A mapping entry saved via `bridge_save_connections`
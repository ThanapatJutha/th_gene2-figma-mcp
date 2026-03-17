# Rule 3 — Component Spec Layer

Spec files are design contracts, not runtime UI.

## Scope

- Spec files: `figma/components/*.figma.ts`
- Runtime components: `src/`

## Source of truth

1. Mapping state (`connections.json`)
2. Existing `.figma.ts` spec
3. Live Figma node data

## Required behavior

- Read matching spec before style-copy/sync
- If missing, generate spec from mapping + node data
- Save with stable naming and deterministic structure

## After promotion

Every newly created component must get a saved spec file.
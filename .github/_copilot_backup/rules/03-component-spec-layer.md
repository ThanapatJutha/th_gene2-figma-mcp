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

## File naming

- Component name in PascalCase: `Button.figma.tsx`, `Card.figma.tsx`
- Saved via `bridge_save_component_spec(name, content)`
- Stored in `figma/components/`

## JSDoc comment (mandatory)

Every `.figma.tsx` file MUST include a JSDoc comment with:

```tsx
/**
 * Figma DS Page: {ComponentName}
 * Library: {libraryName}           // e.g., "shadcn/ui"
 * Master components: {matrix}      // e.g., "size=md,lg × variant=solid,outline,ghost × state=default,hover,pressed,disabled"
 * Figma page node: {pageNodeId}    // e.g., "42:100"
 * Source: {sourceFilePath}         // e.g., "src/components/ui/button.tsx"
 */
```

## Import path detection

1. Try `bridge_read_component_source(name="{ComponentName}")` first
2. Fallback to library standard paths:
   - shadcn/ui: `@/components/ui/{component}`
   - MUI: `@mui/material/{Component}`
   - Chakra UI: `@chakra-ui/react`
   - Ant Design: `antd`

## After promotion

Every newly created Figma component must get:
1. A `.figma.tsx` React component file in `figma/components/`
2. A mapping entry saved via `bridge_save_connections`

## Connections.json rules

- One entry per master component
- `figmaComponentName` matches property-based name exactly
- Read existing connections before saving (merge, don't replace)
- `linkedAt` uses current ISO 8601 timestamp
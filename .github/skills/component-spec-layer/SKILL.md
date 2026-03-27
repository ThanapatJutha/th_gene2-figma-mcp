---
name: component-spec-layer
description: >
  Rules for creating and managing .figma.tsx component spec files. Use when
  creating, reading, or updating React component files in figma/components/,
  managing connections.json mappings, or syncing code↔Figma component state.
---

# Component Spec Layer

`.figma.tsx` files are **real, renderable React components** that wrap the
project's UI library. They contain visual/style code only — never business logic.

---

## Scope

| Path | Contains |
|------|----------|
| `figma/components/*.figma.tsx` | Figma React UI components (visual shell) |
| `src/` | Runtime / business logic code |

---

## Source of truth order

1. `figma/config/figma.config.json` (project config, file key)
2. `connections.json` (mapping state)
3. Existing `.figma.tsx` component files
4. Live Figma node data

---

## Required behavior

- Read matching `.figma.tsx` file before style-copy/sync
- If missing, generate a React component that imports and renders the project's
  actual UI library component with all visual variants
- Save with stable naming and deterministic structure
- **No `onClick`, no `useState`, no business logic** in `.figma.tsx` files
- **NEVER duplicate component source code.** The `.figma.tsx` file MUST
  `import` the component from its library path (e.g., `@/components/ui/button`)
  and render it with all visual variants — not copy-paste the component's
  implementation. The `.figma.tsx` is a **visual wrapper** only.

---

## File naming

- Component name in PascalCase: `Button.figma.tsx`, `Card.figma.tsx`
- Saved via `bridge_save_component_spec(name, content)`
- Stored in `figma/components/`

---

## JSDoc comment (mandatory)

Every `.figma.tsx` file MUST include:

```tsx
/**
 * Figma DS Page: {ComponentName}
 * Library: {libraryName}
 * Master components: {matrix}
 * Figma page node: {pageNodeId}
 * Source: {sourceFilePath}
 */
```

---

## Import path detection

1. Try `bridge_read_component_source(name="{ComponentName}")` first
2. Fallback to library standard paths:
   - shadcn/ui: `@/components/ui/{component}`
   - MUI: `@mui/material/{Component}`
   - Chakra UI: `@chakra-ui/react`
   - Ant Design: `antd`

---

## Example `.figma.tsx` file

```tsx
// ✅ CORRECT: imports the component from the library and renders all variants
import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Figma DS Page: Button
 * Library: shadcn/ui
 * Master components: 6 variants × 5 sizes = 30
 * Figma page node: 92:472
 * Component set: 101:547
 * Source: figma/showcase/src/components/ui/button.tsx
 */

const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;
const sizes = ["default", "xs", "sm", "lg", "icon"] as const;

export default function ButtonFigma() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {sizes.map((size) => (
            <Button key={`${variant}-${size}`} variant={variant} size={size}>
              {size === "icon" ? "✦" : "Button"}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}

export { Button };
```

```tsx
// ❌ WRONG: copies raw component source code — NEVER do this
import { cva } from "class-variance-authority";
const buttonVariants = cva("...", { variants: { ... } });
function Button({ ... }) { ... }
export { Button };   // This duplicates the source, not a wrapper!
```

**Key rules:**
- Import and render the REAL component from the project's UI library
- Show all visual variants side-by-side
- No `onClick`, no `useState`, no business logic
- Include JSDoc with Figma node ID and source file path

---

## After promotion

Every newly created Figma component must get:
1. A `.figma.tsx` React component file in `figma/components/`
2. A mapping entry saved via `bridge_save_connections`

---

## connections.json rules

```jsonc
{
  "version": 1,
  "connections": [
    {
      "figmaNodeId": "42:100",
      "figmaComponentName": "variant=default, size=sm",
      "codeComponent": "Button",
      "file": "src/components/ui/button.tsx",
      "linkedAt": "2026-03-17T12:00:00.000Z"
    }
  ]
}
```

- One entry per master component (or one for the COMPONENT_SET)
- `figmaComponentName` matches property-based name exactly
- Read existing connections before saving (merge, don't replace)
- `linkedAt` uses current ISO 8601 timestamp

---

## Standard style/sync flow

1. Check existing `.figma.tsx` files
2. Read component file if exists
3. If missing: read mappings + node, then create/save React component
4. For sync: diff existing vs. live Figma state, then apply updates

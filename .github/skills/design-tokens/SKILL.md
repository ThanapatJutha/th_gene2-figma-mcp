---
name: design-tokens
description: >
  Create, read, and manage Figma design tokens (variables) for component styling.
  Use when creating design tokens, managing color variables, or applying tokenized
  styling to Figma components. Covers naming conventions, minimum token sets, and
  the creation workflow.
---

# Design Tokens

Use Figma variables for tokenized styling. Always prefer variables over
hardcoded hex values.

---

## Operations

| Tool | When |
|------|------|
| `bridge_read_variables` | Check existing tokens before creating (avoid duplicates) |
| `bridge_create_variable` | Create new tokens |
| `bridge_update_variable` | Update token values |

---

## Token naming convention

Format: `{category}/{role}/{scale}`

```
color/primary/500      = #22C55E   (main primary)
color/primary/600      = #16A34A   (hover)
color/primary/700      = #15803D   (pressed)
color/primary/100      = #DCFCE7   (light bg)

color/destructive/500  = #EF4444
color/destructive/600  = #DC2626

color/neutral/50       = #FAFAFA   (background)
color/neutral/200      = #E5E5E5   (border)
color/neutral/400      = #A3A3A3   (disabled text)
color/neutral/500      = #737373   (secondary text)
color/neutral/900      = #171717   (primary text)

color/white            = #FFFFFF
color/black            = #000000
```

---

## Minimum token set per component

| Token | Purpose | Example |
|-------|---------|---------|
| `color/primary/500` | Default fill for primary variant | `#22C55E` |
| `color/primary/600` | Hover fill | `#16A34A` |
| `color/primary/700` | Pressed fill | `#15803D` |
| `color/destructive/500` | Destructive variant fill | `#EF4444` |
| `color/destructive/600` | Destructive hover fill | `#DC2626` |
| `color/neutral/200` | Border / outline variant stroke | `#E5E5E5` |
| `color/neutral/400` | Disabled text/fill | `#A3A3A3` |
| `color/neutral/900` | Default text color | `#171717` |
| `color/white` | Button text on filled variants | `#FFFFFF` |

---

## Creation workflow

1. **Read existing tokens:** `bridge_read_variables` — avoid duplicates
2. **Present token plan** to user:
   ```
   I'll create these design tokens:
   - color/primary/500 = #22C55E
   - color/primary/600 = #16A34A
   - ...
   Proceed?
   ```
3. **Create tokens:** `bridge_create_variable` for each
4. **Apply to components:** Reference variable IDs in master component fills/strokes

---

## User input mapping

| User says | Token created |
|-----------|--------------|
| "green-500 as primary" | `color/primary/500 = #22C55E` |
| "blue as primary color" | `color/primary/500 = #3B82F6` (infer standard blue-500) |
| "use red for destructive" | `color/destructive/500 = #EF4444` |
| "#8B5CF6 as primary" | `color/primary/500 = #8B5CF6` (exact hex) |

When the user gives a color name without a specific shade, use the 500 shade
as default and derive hover (600) and pressed (700) by darkening ~10% and ~15%.

---

## Token-to-fill application

### Priority order

1. Use `bridge_create_variable` result IDs to set fills by variable binding
2. If variable binding is not supported, use hex value from the token
3. Never hardcode hex values — always reference the token name

### For disabled state

Set text opacity to 0.5 or use `color/neutral/400`.

---

## Token-to-fill mapping (full reference)

Map variant + state to design token fills when creating master components:

| Variant | State | Fill token | Text token | Border token |
|---------|-------|-----------|------------|-------------|
| solid | default | `color/primary/500` | `color/white` | — |
| solid | hover | `color/primary/600` | `color/white` | — |
| solid | pressed | `color/primary/700` | `color/white` | — |
| solid | disabled | `color/neutral/200` | `color/neutral/400` | — |
| outline | default | transparent | `color/primary/500` | `color/primary/500` |
| outline | hover | `color/primary/100` | `color/primary/600` | `color/primary/600` |
| outline | pressed | `color/primary/100` | `color/primary/700` | `color/primary/700` |
| outline | disabled | transparent | `color/neutral/400` | `color/neutral/200` |
| dim | default | `color/primary/100` | `color/primary/500` | — |
| dim | hover | `color/primary/100` | `color/primary/600` | — |
| dim | pressed | `color/primary/100` | `color/primary/700` | — |
| dim | disabled | `color/neutral/200` | `color/neutral/400` | — |
| ghost | default | transparent | `color/primary/500` | — |
| ghost | hover | `color/primary/100` | `color/primary/600` | — |
| ghost | pressed | `color/primary/100` | `color/primary/700` | — |
| ghost | disabled | transparent | `color/neutral/400` | — |
| destructive-solid | default | `color/destructive/500` | `color/white` | — |
| destructive-solid | hover | `color/destructive/600` | `color/white` | — |
| destructive-solid | pressed | `color/destructive/600` | `color/white` | — |
| destructive-solid | disabled | `color/neutral/200` | `color/neutral/400` | — |
| destructive-outline | default | transparent | `color/destructive/500` | `color/destructive/500` |
| destructive-outline | hover | `color/destructive/500` | `color/white` | `color/destructive/500` |
| destructive-outline | pressed | `color/destructive/600` | `color/white` | `color/destructive/600` |
| destructive-outline | disabled | transparent | `color/neutral/400` | `color/neutral/200` |

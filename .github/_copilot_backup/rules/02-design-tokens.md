# Rule 2 — Design Tokens

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

When creating a DS component page, create at least these tokens:

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
   - color/primary/500 = #22C55E (from your "green-500" input)
   - color/primary/600 = #16A34A (10% darker for hover)
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
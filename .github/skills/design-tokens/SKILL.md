---
name: design-tokens
description: >
  Sync design tokens between Figma variables and the local project.
  Use when user mentions "design tokens", "CI tokens", "sync tokens",
  "pull variables", "generate theme", "token sync", or needs to ensure
  design tokens exist before creating components. Covers the full
  pull → generate → push workflow and token prerequisite checks.
---

# Design Token Sync

Bidirectional sync between Figma variables (CI) and local theme files.
Tokens flow: **Figma → tokens.json → CSS custom properties + TypeScript**.

---

## Prerequisite check (run before other skills)

Before running `create-ds-component-page` or building components:

1. Check if `figma/tokens/tokens.json` exists and has collections
2. If empty or missing → call `bridge_read_variables` to check Figma CI
3. If Figma has variables → run `tokens pull` + `tokens generate`
4. If Figma has NO variables → **ask user**: "No design tokens found in Figma. Continue with hardcoded values or create tokens first?"

```
# Check tokens exist
if figma/tokens/tokens.json is empty or has no collections:
  → bridge_read_variables
  → if variables found: run `npx gene2-figma-mcp tokens sync`
  → if no variables: prompt user
```

---

## CLI commands

| Command | Purpose |
|---------|---------|
| `npx gene2-figma-mcp tokens pull` | Read Figma variables → `figma/tokens/tokens.json` |
| `npx gene2-figma-mcp tokens generate` | Convert `tokens.json` → CSS + TypeScript |
| `npx gene2-figma-mcp tokens push` | Write `tokens.json` → Figma variables |
| `npx gene2-figma-mcp tokens sync` | Pull + generate in one step |

---

## File structure

| File | Purpose |
|------|---------|
| `figma/tokens/tokens.json` | Source-of-truth sync file (Figma ↔ code) |
| `src/tokens/tokens.css` | CSS custom properties (auto-generated) |
| `src/tokens/tokens.ts` | TypeScript token constants (auto-generated) |

---

## tokens.json format

```json
{
  "version": 1,
  "figmaFileKey": "VV3UngGp4iFEQgqdqrnoOu",
  "lastSyncedAt": "2026-04-02T...",
  "collections": {
    "01 Color - Primitive Token": {
      "modes": ["default"],
      "variables": {
        "neutral/000": { "type": "COLOR", "values": { "default": "#ffffff" } },
        "primary/blue/main": { "type": "COLOR", "values": { "default": "#1e56a0" } }
      }
    },
    "02 Color - Semantic Token": {
      "modes": ["default"],
      "variables": {
        "surface/primary/default": { "type": "COLOR", "values": { "default": "#ffffff" } },
        "text/primary": { "type": "COLOR", "values": { "default": "#18181b" } }
      }
    },
    "04 Typo - Semantic Token": {
      "modes": ["mode-1", "mode-2"],
      "variables": {
        "Size/16": { "type": "FLOAT", "values": { "mode-1": 16, "mode-2": 16 } },
        "Family/Font": { "type": "STRING", "values": { "mode-1": "Kanit", "mode-2": "CS ChatThai" } }
      }
    }
  }
}
```

---

## Generated CSS format

```css
:root {
  /* 01 Color - Primitive Token */
  --color-primitive-token-neutral-000: #ffffff;
  --color-primitive-token-primary-blue-main: #1e56a0;

  /* 02 Color - Semantic Token */
  --color-semantic-token-surface-primary-default: #ffffff;
  --color-semantic-token-text-primary: #18181b;

  /* 04 Typo - Semantic Token (default mode) */
  --typo-semantic-token-size-16: 16px;
  --typo-semantic-token-line-height-size-16: 24px;
  --typo-semantic-token-weight-regular: 400;
  --typo-semantic-token-family-font: "Kanit";
}

/* Mode overrides */
.theme-mode-2 {
  --typo-semantic-token-line-height-size-16: 20px;
  --typo-semantic-token-weight-bold: 700;
  --typo-semantic-token-family-font: "CS ChatThai";
}
```

---

## Using tokens in components

### In `.figma.tsx` files (showcase/capture)

```tsx
import '../../src/tokens/tokens.css';

export default function ButtonPreview() {
  return (
    <div style={{ background: 'var(--color-semantic-token-surface-primary-default)' }}>
      <Button>Click me</Button>
    </div>
  );
}
```

### In real React components

```tsx
// Import the generated CSS in your app entry point
import './tokens/tokens.css';

// Use CSS variables in component styles
<div className="bg-[var(--color-semantic-token-surface-primary-default)]">
```

### Rule: Never hardcode colors

- ❌ `color: #18181b;`
- ❌ `fills: [{ type: "SOLID", color: { r: 0.09, g: 0.09, b: 0.09 } }]`
- ✅ `color: var(--color-semantic-token-text-primary);`
- ✅ Look up the hex value from `tokens.json` when setting Figma fills via bridge

### Rule: Typography tokens have proper CSS units

Collections matching "Typo" are auto-formatted:

| Variable prefix | CSS format | Example |
|---|---|---|
| `Size/*` | `{value}px` | `--size-16: 16px;` |
| `Line Height/*` | `{value}px` | `--line-height-size-16: 24px;` |
| `Weight/*` | Numeric weight | `--weight-regular: 400;` |
| `Family/*` | Quoted string | `--family-font: "Kanit";` |
| Primitive font names | Quoted string | `--kanit: "Kanit";` |

Weight string → number mapping: Thin=100, Light=300, Regular=400, Medium=500, SemiBold=600, Bold=700, ExtraBold=800, Black=900.

---

## Workflow: First-time setup

1. User opens a Figma file with existing variables (CI)
2. Run `npx gene2-figma-mcp tokens sync` (or Copilot runs it)
3. `tokens.json` created with all collections
4. CSS + TS files generated in `src/tokens/`
5. Import `tokens.css` in the app entry point
6. Components reference CSS variables instead of hardcoded values

---

## Workflow: Ongoing sync

| Direction | Command | When |
|-----------|---------|------|
| Figma → Code | `tokens pull` + `tokens generate` | Designer updates tokens in Figma |
| Code → Figma | Edit `tokens.json` + `tokens push` | Developer adds/changes tokens |

---

## Token naming convention (MFA standard)

Collections follow the pattern: `{number} {Category} - {Level} Token`

### Primitive tokens (raw values)
- `color/neutral/{scale}` — 000 to 1000
- `color/primary/blue/{scale}` — 100-900 + main
- `color/secondary/{color}/{scale}` — green, red, yellow
- `color/tertiary/{color}/{scale}` — cerulean, lavender blue, purple, sky
- `overlay/{opacity}` — 10 to 90

### Semantic tokens (purpose-based)
- `surface/{role}/{state}` — primary, secondary, accent, disabled, status
- `text/{role}` — primary, secondary, tertiary, disabled, inverse, link, status
- `icon/{role}` — primary, secondary, disabled, inverse, link, status
- `border/{role}` — primary, secondary, disabled, inverse, selected, status

### Typography tokens
- `Size/{px}` — 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48
- `Line Height/size {px}` — matching line heights
- `Weight/{name}` — Regular, Medium, Bold
- `Family/Font` — multi-mode (Kanit / CS ChatThai)

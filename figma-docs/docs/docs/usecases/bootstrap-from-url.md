---
sidebar_position: 3
slug: /usecases/create-ds-component-page
---

# Create Design System Component Page

Create a structured Figma Design System page for any UI component — with header, master components, and optional variants table — entirely through Copilot prompts.

## Why?

Professional design system teams organize their Figma files with **structured component pages**, not flat captures. Each component gets a dedicated page with:

| Section | Content | Example (Button) |
|---------|---------|-------------------|
| **1 — Header** | Component name, description, breadcrumb | `PALO IT · Components → Button` |
| **2 — Variants table** *(optional)* | Grid of instances: variant rows × state columns | Solid / Outline / Ghost × Default / Hover / Pressed / Disabled |
| **3 — Master components** | All variant combinations as Figma components | `size=md, variant=solid, state=default, type=default` |

This workflow builds all of that **programmatically** using the bridge MCP tools — no manual Figma work required.

## Prerequisites

Make sure the Plugin Bridge is fully set up:

- ✅ Bridge server running (`npm run bridge`)
- ✅ Figma plugin open and showing 🟢 **Connected**
- ✅ Copilot Agent Mode enabled in VS Code
- ✅ Figma file key configured in `figma/config/figma.config.json`
- ✅ Template components pre-seeded in your Figma file (see [Template Setup](#template-setup))

See [Getting Started](/docs/getting-started) for the full setup guide.

![Plugin connected to the bridge](/img/plugin-connected.png)

:::danger Don't touch Figma while Copilot is working
While Copilot is executing commands through the bridge, **do not switch pages or open a different Figma file**. All bridge commands operate on the currently active page — switching mid-operation will cause commands to target the wrong page.
:::

---

## Prompt 1 — Create the DS Component Page

This is the main prompt. It creates the header, master components, design tokens, and saves code artifacts.

:::note 💬 Prompt
Create a Design System page for Button based on shadcn/ui.

Use green-500 (#22C55E) as the primary color.

Create the design tokens as Figma variables.
:::

**What happens:**

1. Copilot identifies the component (Button) and library (shadcn/ui)
2. Infers variants: solid, outline, dim, ghost, destructive-solid, destructive-outline
3. Infers states: default, hover, pressed, disabled
4. Infers sizes: md, lg (reduced matrix for reliability — add sm later)
5. Presents variant plan to user for confirmation
6. Creates design tokens as Figma variables (`color/primary/500`, etc.)
7. Discovers template components (`T Header`, `T Section Header`, etc.)
8. Creates a new "Button" page in Figma
9. Builds master components (48 variants: 2 sizes × 6 variants × 4 states)
10. Builds header section using `T Header` template
11. Saves `.figma.tsx` + `connections.json`

### Build order

Copilot builds sections in this specific order:

```
Section 3 (Master Components) → Section 1 (Header) → Dividers → Save artifacts
```

Master components are built first because the variants table (if added later) needs their IDs to create instances.

---

## Prompt 2 (optional) — Add Variants Table

After master components exist, you can add the variants table:

:::note 💬 Prompt
Now build the variants table (Section 2) for the Button DS page using instances of the master components.
:::

**What happens:**

- Copilot reads existing master components from the page
- Creates a grid table: variant rows × state columns
- Each cell contains an **instance** of the corresponding master component
- Adds a `T Section Header` ("✏️ Variants") above the table

---

## Follow-up Prompts

After the initial creation, you can expand:

:::note 💬 Add more sizes
Add size=sm variants to the Button master components. Use height=32, minWidth=64.
:::

:::note 💬 Add icon variants
Add type=icon-left variants to all existing Button master components.
:::

:::note 💬 Create another component
Create a DS page for Card based on shadcn/ui using the same design tokens.
:::

---

## What Gets Created

### In Figma

| Element | Details |
|---------|---------|
| New page | Named after the component (e.g., "Button") |
| Master components | Property-based naming: `size=md, variant=solid, state=default, type=default` |
| Design tokens | Figma variables: `color/primary/500`, `color/destructive/500`, etc. |
| Header | `T Header` instance with breadcrumb, title, description |
| Dividers | `T Divider` instances between sections |

### In your codebase

| File | Content |
|------|---------|
| `figma/components/Button.figma.tsx` | React component rendering all Button variants (visual only) |
| `figma/app/.figma-sync/connections.json` | Mappings between Figma node IDs and code components |

---

## Template Setup

Your Figma file needs pre-seeded template components for consistent DS pages. These templates use a `T ` prefix:

| Template | Purpose |
|----------|---------|
| `T Header` | Page header with breadcrumb, title, description |
| `T Section Header` | Section label (e.g., "✏️ Variants") |
| `T Divider` | Visual separator between sections |

Optional helpers: `Badge`, `Divider`

:::tip Template fallbacks
If templates are missing, Copilot creates fallback frames with approximate dimensions. But for the best results, pre-seed the templates first.
:::

### How to set up templates

1. Open your target Figma file
2. Create a "Templates" page
3. Create each template component (`T Header`, `T Section Header`, `T Divider`)
4. Publish them so they appear in the Assets panel

See the reference file `DS-creation-test` → `Button-example` page for the expected template dimensions and styling.

---

## Property-Based Naming

Master components use this naming format:

```
size=md, variant=solid, state=default, type=default
```

Rules:
- Properties always in order: `size`, `variant`, `state`, `type`
- Values are lowercase with hyphens: `destructive-solid`, `icon-left`
- Comma + single space between properties

This creates a proper variant picker in Figma's component properties panel.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Figma plugin not connected" | Plugin window not open | Open the plugin in Figma |
| Missing design tokens | `bridge_read_variables` returned empty | Check Figma file has variable support |
| Template not found | Templates not created in Figma file | Follow the Template Setup section above |
| Components incomplete | Context window ran out during batch | Run a follow-up prompt to complete remaining sizes |
| Layout drift | Components overlapping or misaligned | Copilot uses fixed layout constants — report the issue for tuning |

---

## Example Prompts

| Prompt | What It Does |
|--------|-------------|
| *"Create DS page for Button based on shadcn/ui. Use green-500 as primary."* | Full DS page with master components |
| *"Create DS page for Card based on MUI."* | Card component page with MUI variants |
| *"Build the variants table for the Button page."* | Adds Section 2 with instances |
| *"Add size=sm variants to Button."* | Expands the matrix with small size |
| *"Create design tokens: blue-500 as primary, red-500 as destructive."* | Creates Figma variables only |

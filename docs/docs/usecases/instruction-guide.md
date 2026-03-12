---
sidebar_position: 2
slug: /usecases/instruction-guide
title: instruction.md for Copilot
---

# instruction.md for Copilot

This is the **`instruction.md`** file that lives in your project root. Copilot reads it automatically to understand how the capture-then-componentize workflow works. You don't need to memorize any of this — just drop the file into your project and Copilot will follow it.

:::tip How to use this
1. Copy the code block below into a file called **`instruction.md`** at your project root
2. When you prompt Copilot, it will read this file as context and follow the workflow automatically
3. Replace `YOUR_FILE_KEY` with your actual Figma file key
:::

---

## The `instruction.md` file

````markdown
# Bootstrap Figma Components — Instruction Guide

> Practical runbook for the **capture-then-componentize** workflow.

---

## Overview

The workflow has **two prompt sessions**:

| Session | What happens | Tools |
|---------|-------------|-------|
| **Prompt 1** — Capture | Capture rendered HTML → editable Figma layers | `generate_figma_design` (Figma MCP) |
| **Prompt 2** — Componentize | Inspect layers → create Components page → promote frames | Bridge MCP tools |

---

## Prompt 1 — Capture

### Option A: Use `generate_figma_design` directly (recommended)

The Figma MCP tool `generate_figma_design` handles the capture end-to-end.
Copilot calls it like:

1. `generate_figma_design({ outputMode: "existingFile", fileKey: "YOUR_FILE_KEY" })`
   → Returns captureId + instructions to open a browser URL
2. User opens the capture URL in browser (or Copilot uses Playwright)
3. Poll: `generate_figma_design({ captureId: "..." })` every 5s until "completed"

**This is the cleanest path** — Figma's own infrastructure handles the heavy lifting.

### Option B: Manual Playwright script (write your own `.cjs`)

If you need more control (custom viewport, selector, CSP stripping), you can
write a **temporary** Playwright script to inject `capture.js` manually.
This script is project-specific and **should be deleted after use**.

> **Note:** `*.cjs` files are git-ignored by default.

#### ⚠️ Known Issue: Playwright capture script freezes

**Symptom:** The script prints "Running captureForDesign..." and then hangs forever.

**Root cause:** `window.figma.captureForDesign()` uploads the entire captured DOM
to Figma's servers. For complex pages this can take 30–120+ seconds. The
`page.evaluate()` blocks until the promise resolves, and sometimes it never does —
the capture completes server-side but the promise hangs in the browser context.

**Fix — Use Promise.race with a timeout:**

```javascript
const result = await Promise.race([
  page.evaluate(({ captureId, endpoint }) => {
    return window.figma.captureForDesign({
      captureId, endpoint, selector: 'body'
    });
  }, { captureId: CAPTURE_ID, endpoint: ENDPOINT }),
  new Promise((resolve) => setTimeout(() => resolve({ status: 'timeout-ok' }), 60000))
]);
```

**Why this works:** The capture data is uploaded as it runs. Even if the promise
never resolves, the server already received the data. Polling the captureId will
return "completed" once processing finishes.

**Alternative — global process timeout:**

```javascript
setTimeout(() => {
  console.log('Global timeout — capture likely succeeded. Poll captureId.');
  process.exit(0);
}, 90000);
```

---

## Prompt 2 — Componentize

After the capture succeeds (confirmed by polling), start a **new prompt session**.

### Prompt to paste:

> Inspect the captured page in Figma. Use `bridge_list_layers` to find the key
> components (Sidebar, StatCards, ChartCard, DataTable, etc.). Create a
> "📦 Components" page with a wrapper frame called "Component Library" that will
> contain all components. Move each component frame into that wrapper,
> **reposition them in a clean grid layout using `bridge_update_node` with x/y**
> (small controls in a row at top, stat cards in a row below, large content cards
> stacked vertically), promote each to a master component, then delete the raw
> capture page.

### What Copilot does:

1. `bridge_list_layers()` → inspect all captured layers
2. `bridge_create_page({ name: "📦 Components" })` → create component library page
3. `bridge_create_node({ type: "FRAME", ... })` → create wrapper frame
4. `bridge_move_node()` × N → move frames into wrapper
5. `bridge_update_node({ x, y })` × N → reposition in grid
6. `bridge_create_component()` × N → promote to master components
7. `bridge_delete_node()` → remove raw capture page
8. `bridge_save_connections()` → persist mappings

### ⚠️ Why wrapper frame + repositioning are required

**Wrapper frame:** All components should live inside a single parent frame on the
📦 Components page — not as loose top-level children. This keeps the canvas
organized and follows Figma best practices.

**Repositioning:** `bridge_move_node` retains original x/y from the captured page,
causing components to **overlap**. You must reposition with `bridge_update_node`.

### Layout Convention

```
y=0      Small Controls (row):  ButtonPrimary  ButtonSecondary  ThemeSwitcher
y=120    Navigation (stacked):  TabsList, TablePagination
y=340    Headers (stacked):     SiteHeader, DashboardHeader
y=600    Stat Cards (row):      Revenue  Subscriptions  Sales  ActiveUsers
y=900    Content Cards (stack): ChartCard, DataTable
y=2020   Page-Level (stack):    HeroSection, Footer
y=2680   Full Layouts (side):   Sidebar | DashboardCard
```

Rules of thumb:
- Small components (< 200px): horizontal row, 50–80px gaps
- Medium components (200–500px): stack vertically, 80px gap
- Large components (> 500px): stack vertically, 100px gap
- Full-page layouts: bottom, side by side

---

## Prerequisites Checklist

- [ ] Bridge server running: `npm run bridge` (port 9001)
- [ ] Figma plugin open and connected (🟢 in plugin UI)
- [ ] Figma MCP configured in `.vscode/mcp.json`
- [ ] VS Code Copilot in Agent Mode
- [ ] Figma file key known

---

## Troubleshooting

### Playwright capture freezes
Apply the timeout fix above or use Option A.

### Capture returns "pending" forever
Try a simpler URL, increase timeout, or check for auth/paywall.

### Bridge not connected
```bash
lsof -ti :9001 | xargs kill -9 2>/dev/null
npm run bridge
```
Re-open the Figma plugin and verify 🟢 Connected.

### Captured layers look wrong
- Fixed/sticky elements may appear at wrong positions
- Lazy-loaded content may be missing — scroll before capturing
- Canvas/WebGL content captured as flat images
````

---

## What Copilot does with this file

When `instruction.md` is in your project root, Copilot automatically picks it up as context. This means:

- **You don't need to explain the workflow** — just say "capture this URL" or "componentize the captured page"
- **Copilot knows the tool sequence** — it will call `generate_figma_design`, poll, then use bridge tools in the right order
- **Copilot knows the layout rules** — it will reposition components in a grid instead of leaving them overlapping
- **Copilot knows the workarounds** — if a Playwright script freezes, it applies the timeout fix automatically

:::info Already included in figma-sync
If you cloned this project, `instruction.md` is already in the project root — no setup needed. Just start prompting!
:::

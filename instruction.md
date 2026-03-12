# Bootstrap Figma Components — Instruction Guide

> Practical runbook for the **capture-then-componentize** workflow.
> Date: 2026-03-12

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

The Figma MCP tool `generate_figma_design` handles the capture end-to-end. Copilot calls it like:

```
1. generate_figma_design({ outputMode: "existingFile", fileKey: "ghwHnqX2WZXFtfmsrbRLTg" })
   → Returns captureId + instructions to open a browser URL

2. User opens the capture URL in browser (or Copilot uses Playwright)

3. Poll: generate_figma_design({ captureId: "..." }) every 5s until "completed"
```

**This is the cleanest path** — Figma's own infrastructure handles the heavy lifting.

### Option B: Manual Playwright script (write your own `.cjs`)

If you need more control (custom viewport, selector, CSP stripping), you can write a **temporary** Playwright script to inject `capture.js` manually. This script is project-specific (hardcoded URLs, file keys, capture IDs) and **should be deleted after use** — it is not part of the figma-sync library.

> **Note:** `*.cjs` files are git-ignored by default. Any helper scripts you create during the capture workflow will not be committed.

#### ⚠️ Known Issue: Playwright capture script freezes

**Symptom:** The script prints `"Running captureForDesign..."` and then hangs forever. The terminal never returns.

**Root cause:** `window.figma.captureForDesign()` uploads the entire captured DOM to Figma's servers. For complex pages (like the Shadcn dashboard with many components, SVG charts, and tables), this upload can take 30–120+ seconds. The `page.evaluate()` call blocks until the promise resolves, and sometimes it **never resolves** — the capture completes server-side but the promise hangs in the browser context.

**Fix — Add a timeout and don't wait for the result:**

```javascript
// BEFORE (freezes):
const result = await page.evaluate(({ captureId, endpoint }) => {
  return window.figma.captureForDesign({
    captureId,
    endpoint,
    selector: 'body'
  });
}, { captureId: CAPTURE_ID, endpoint: ENDPOINT });

// AFTER (works):
// Fire the capture but don't await the return value.
// Use Promise.race with a timeout so the script always exits.
const result = await Promise.race([
  page.evaluate(({ captureId, endpoint }) => {
    return window.figma.captureForDesign({
      captureId,
      endpoint,
      selector: 'body'
    });
  }, { captureId: CAPTURE_ID, endpoint: ENDPOINT }),
  new Promise((resolve) => setTimeout(() => resolve({ status: 'timeout-ok' }), 60000))
]);
```

**Why this works:** The capture data is uploaded to Figma's servers as it runs. Even if the promise never resolves in the browser, the server already received the data. Polling the `captureId` via `generate_figma_design({ captureId })` will return `"completed"` once the server finishes processing.

**Alternative fix — add a global process timeout:**

```javascript
// Add at the top of the script, right after the imports:
setTimeout(() => {
  console.log('Global timeout reached — capture likely succeeded server-side.');
  console.log('Poll the captureId to confirm.');
  process.exit(0);
}, 90000); // 90 seconds max
```

**Other tips to prevent the freeze:**

1. **Use `headless: true`** — the headed browser keeps the process alive longer
2. **Kill the browser immediately after firing the capture:**
   ```javascript
   // Don't await the result, just fire and close
   page.evaluate(({ captureId, endpoint }) => {
     window.figma.captureForDesign({ captureId, endpoint, selector: 'body' });
   }, { captureId, endpoint });

   // Give it a few seconds to start the upload, then close
   await page.waitForTimeout(10000);
   await browser.close();
   process.exit(0);
   ```
3. **Poll `captureId` separately** — the script's job is to fire the capture; polling should happen in a separate step (or via `generate_figma_design` MCP tool)

---

## Prompt 2 — Componentize

After the capture succeeds (confirmed by polling), start a **new prompt session**:

### Copy-paste prompt:

> Inspect the captured page in Figma. Use `bridge_list_layers` to find the key components (Sidebar, StatCards, ChartCard, DataTable, etc.). Create a "📦 Components" page with a wrapper frame called "Component Library" that will contain all components. Move each component frame into that wrapper, **reposition them in a clean grid layout using `bridge_update_node` with x/y** (small controls in a row at top, stat cards in a row below, large content cards stacked vertically), promote each to a master component, then delete the raw capture page.

### What Copilot does:

1. `bridge_list_layers()` → inspect all captured layers
2. `bridge_create_page({ name: "📦 Components" })` → create component library page
3. `bridge_create_node({ type: "FRAME", parentId: pageId, name: "Component Library" })` → create a wrapper frame to hold all components
4. `bridge_move_node()` × N → move selected frames into the wrapper frame
5. **`bridge_update_node({ x, y })` × N → reposition components in a grid** _(see layout convention below)_
6. `bridge_create_component()` × N → promote to master components
7. `bridge_delete_node()` → remove raw capture page
8. `bridge_save_connections()` → persist mappings

### ⚠️ Why a wrapper frame + repositioning are required

**Wrapper frame:** All components should live inside a single parent frame (e.g. "Component Library") on the 📦 Components page — not as loose top-level children of the page. This keeps the canvas organized, makes it easy to select/move all components together, and follows Figma best practices for component libraries.

**Repositioning:** When `bridge_move_node` moves frames to the Components page, they **retain their original x/y coordinates** from the captured page. This causes all components to **overlap** on top of each other. You must reposition them with `bridge_update_node` before promoting.

### Layout Convention

Arrange components in a vertical flow, grouped by size category, with generous spacing:

```
y=0      Small Controls (row):  ButtonPrimary  ButtonSecondary  ThemeSwitcher  DropdownTrigger
y=120    Navigation (stacked):   TabsList, TablePagination
y=340    Headers (stacked):      SiteHeader, DashboardHeader
y=600    Stat Cards (row):       Revenue  Subscriptions  Sales  ActiveUsers  (300px apart)
y=900    Content Cards (stack):  ChartCard, DataTable
y=2020   Page-Level (stack):     HeroSection, Footer
y=2680   Full Layouts (side):    Sidebar | DashboardCard (side by side)
```

**Rules of thumb:**
- **Small components** (< 200px wide): arrange in a horizontal row, 50–80px gaps
- **Medium components** (200–500px wide): stack vertically, 80px vertical gap
- **Large components** (> 500px wide): stack vertically, 100px vertical gap
- **Full-page layouts**: place at the bottom, side by side if they're complementary

---

## Prerequisites Checklist

Before running either prompt:

- [ ] Bridge server running: `npm run bridge` (port 9001)
- [ ] Figma plugin open and connected (🟢 in plugin UI)
- [ ] Figma MCP configured in `.vscode/mcp.json`
- [ ] VS Code Copilot in Agent Mode
- [ ] Figma file key known: `ghwHnqX2WZXFtfmsrbRLTg`

For manual Playwright script (Option B):

- [ ] Playwright installed: `npx playwright install chromium`
- [ ] Script has timeout protection (see fix above)

---

## Troubleshooting

### Playwright capture script freezes

See the **Known Issue** section above. Apply the timeout fix or use Option A instead.

### Capture returns `"pending"` forever

The page may not have loaded properly. Try:
- A simpler URL (e.g. `/docs/components/button` instead of `/examples/dashboard`)
- Increasing `waitUntil: 'networkidle'` timeout
- Checking the page isn't behind auth or a paywall

### Bridge not connected

```bash
# Check if bridge is running
lsof -i :9001

# Restart bridge
lsof -ti :9001 | xargs kill -9 2>/dev/null
npm run bridge
```

Then re-open the Figma plugin and verify 🟢 Connected.

### Captured layers look wrong

The capture quality depends on the page's CSS. Some issues:
- **Fixed/sticky elements** may appear at wrong positions — manually adjust in Figma
- **Lazy-loaded content** may be missing — scroll the page before capturing
- **Canvas/WebGL content** (charts) — captured as flat images, not editable

---

## File Reference

| File | Purpose |
|---|---|
| `userstories/07-bootstrap-from-url.md` | Full user story with acceptance criteria |
| `docs/docs/usecases/bootstrap-from-url.md` | Docusaurus documentation page |
| `.vscode/mcp.json` | MCP server configuration (Figma + Bridge) |
| `figma-plugin/code.ts` | Plugin handlers incl. `create-page`, `set-current-page`, `move-node`, `update-node` (x/y) |
| `src/mcp-server.ts` | MCP tool definitions for bridge commands |

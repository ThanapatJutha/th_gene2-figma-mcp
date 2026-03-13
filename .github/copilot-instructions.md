# Figma Sync — Copilot Instructions

> Auto-read by Copilot on every prompt. Covers all workflows.

---

## Project Overview

**figma-sync** bridges VS Code ↔ Figma via two MCP servers:
- `figma` (HTTP) — Official Figma MCP: capture pages, read design context, variables
- `figma-bridge` (stdio) — Custom bridge: read/write nodes, create components, design tokens

Communication: Copilot → MCP → Bridge WebSocket (port 9001) → Figma Plugin (desktop app)

### Prerequisites (all workflows)
- Bridge running: `npm run bridge` (port 9001)
- Figma plugin open: 🟢 Connected
- Copilot in Agent Mode
- Figma file key from URL: `figma.com/design/FILE_KEY/...`

---

## Usecase 1: Bootstrap Components from URL

Create a Figma component library from any URL — external website or local dev server. The URL can be a live site (e.g., `https://ui.shadcn.com/examples/dashboard`) or a local project (e.g., `http://localhost:5173`).

This workflow is designed to be completed in **3 prompts**.

### Prompt 1 — Build a Showcase App (skip for external URLs)

If the user wants a component library for a UI framework (shadcn/ui, MUI, Chakra, etc.), build a real app that renders all variants — **never hand-draw with `bridge_create_node`**.

**Use the `demo/` folder as a template:**

1. **Scaffold a Vite + React app** in `demo/` (or reuse the existing one)
2. **Install the target component library** (e.g., `npx shadcn@latest add button card badge alert dialog`)
3. **Create a showcase page** (`demo/src/App.tsx`) that renders every component variant in a clean grid:
   - One section per component type (Buttons, Badges, Cards, Alerts, etc.)
   - Show all variants side by side (Default, Destructive, Outline, Ghost, etc.)
   - Use the library's actual props — `<Button variant="destructive">`, not hand-rolled styles
   - White background, generous spacing, clear labels
4. **Serve locally** — `cd demo && npm run dev` → `http://localhost:5173`

**Why this matters:** The captured result preserves exact fonts, shadows, border-radius, padding, and all CSS from the real library. Manual `bridge_create_node` produces flat rectangles.

### Prompt 2 — Capture the URL into Figma

**Tools:** `generate_figma_design` (Figma MCP), Playwright

**For local projects (localhost):**
1. `generate_figma_design({ outputMode: "existingFile", fileKey: "FILE_KEY" })` → returns captureId + browser URL
2. Write a Playwright `.cjs` script to open the capture URL against `http://localhost:5173`, run `captureForDesign()`, use `Promise.race` with 60s timeout
3. Poll: `generate_figma_design({ captureId: "..." })` every 5s until `"completed"`

**For external URLs:**
Same flow, but **must handle lazy-loading**. Use the full-page capture recipe:

1. **Strip CSP** — route all requests and delete `content-security-policy` headers
2. **Navigate** — `waitUntil: 'domcontentloaded'`, then wait 3s for JS hydration
3. **Force eager images** — set `loading='eager'`, copy `data-src` → `src`, `data-srcset` → `srcset`
4. **Slow-scroll the full page** — scroll in 300px steps with 300ms delay to trigger IntersectionObservers
5. **Wait 5s** — let lazy-rendered content settle
6. **Force images again** — new elements may have appeared after scroll
7. **Resize viewport to full page height** — `page.setViewportSize({ width: 1440, height: fullPageHeight })` (cap at 15000px)
8. **Dispatch events** — fire `resize` + `scroll` to trigger remaining observers
9. **Wait 3s** — final settle
10. **Inject capture script & run** — `captureForDesign({ selector: 'body' })`

```js
// Key steps in the .cjs script:
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);

// Force lazy images
await page.evaluate(() => {
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.loading = 'eager';
    if (img.dataset.src) img.src = img.dataset.src;
  });
  document.querySelectorAll('[data-src]').forEach(el => { el.src = el.dataset.src; });
  document.querySelectorAll('[data-srcset], img[data-srcset]').forEach(el => {
    if (el.dataset.srcset) el.srcset = el.dataset.srcset;
  });
});

// Slow-scroll to trigger IntersectionObservers
await page.evaluate(async () => {
  await new Promise(resolve => {
    let total = 0;
    const timer = setInterval(() => {
      window.scrollBy(0, 300);
      total += 300;
      if (total >= document.body.scrollHeight + 1000) { clearInterval(timer); resolve(); }
    }, 300);
  });
});
await page.waitForTimeout(5000);

// Resize viewport to full page height
const fullHeight = await page.evaluate(() => {
  window.scrollTo(0, 0);
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
});
await page.setViewportSize({ width: 1440, height: Math.min(fullHeight, 15000) });
await page.waitForTimeout(3000);

// Then inject capture script and run captureForDesign()
```

Skipping these steps for external sites will result in a capture with only the hero/banner visible and the rest blank. Local projects (localhost) typically don't need lazy-loading handling.

**Playwright notes:** Write a temp `.cjs` script — `*.cjs` files are git-ignored. Use `Promise.race` with 60s timeout since `captureForDesign()` can hang but data uploads server-side. Delete the script after use.

### Prompt 3 — Componentize

**Tools:** Bridge MCP tools

1. `bridge_list_layers()` → find captured frames, identify component candidates
2. `bridge_create_component({ nodeId, name })` × N → promote each to master component using `Category / Variant` naming (e.g., "Button / Default", "Badge / Secondary")
3. Arrange components in a grid layout (see Layout Convention below)
4. `bridge_delete_node()` → remove raw capture page
5. `bridge_save_connections()` → persist code-to-Figma mappings

**Naming convention:** Use ` / ` (space-slash-space) to create variant groups in Figma's Assets panel:
```
Button / Default
Button / Destructive
Button / Outline
Badge / Default
Badge / Secondary
```

**⚠️ Critical — Overlap:** `bridge_move_node` AND `bridge_create_node` both place frames at `(0, 0)`. Always reposition with `bridge_update_node` before promoting. See **"Preventing Frame Overlap"** section for the full algorithm.

### Quick-Start Prompts (copy-paste for users)

| # | Prompt |
|---|--------|
| 1 | *"Build a showcase app for [library] using the `demo/` folder. Render all component variants. Serve on localhost:5173."* |
| 2 | *"Capture `http://localhost:5173` into my Figma file (key: `FILE_KEY`). Use Playwright. Poll until complete."* |
| 3 | *"Find all components in the capture. Promote each to a master component with `Category / Variant` naming. Arrange in a grid. Delete the capture page."* |

For external URLs, skip prompt 1 and use: *"Capture `https://example.com/page` into my Figma file (key: `FILE_KEY`). Use Playwright to handle lazy-loading — slow-scroll, force eager images, resize viewport. Poll until complete."*

### Layout Convention

```
y=0      Small Controls (row):   <200px wide, 50-80px gaps horizontal
y=120    Navigation (stacked):   80px vertical gap
y=340    Headers (stacked):      80px vertical gap
y=600    Stat Cards (row):       300px apart horizontal
y=900    Content Cards (stack):  100px vertical gap
y=2020   Page-Level (stack):     100px vertical gap
y=2680   Full Layouts:           side by side if complementary
```

---

## ⚠️ Preventing Frame Overlap (ALWAYS follow)

All `bridge_create_node` calls place new frames at `(0, 0)` by default. `bridge_move_node` retains original coordinates. In both cases **every sibling frame will overlap** unless you explicitly position them.

> **`bridge_update_node` may silently ignore `x`/`y` changes** — the `"updated"` array often comes back empty for position properties. This means you CANNOT rely on post-creation position updates alone.

### Rules

1. **Track a running cursor** (`nextX` / `nextY`) while creating frames. After each frame, advance the cursor by `frame.width + gap` (horizontal) or `frame.height + gap` (vertical).
2. **Batch similar components into rows**. Start a new row (reset `x`, advance `y`) when switching component types (e.g., Buttons → Badges → Cards).
3. **Always attempt `bridge_update_node({ x, y })` after creation**, but treat it as best-effort. If the update returns an empty `"updated"` array, **try again** or verify with `bridge_read_node`.
4. **Before promoting to master components** (`bridge_create_component`), call `bridge_read_node` on each frame to confirm positions are non-overlapping. Re-issue position updates if needed.
5. **After all components are created**, do a final `bridge_list_layers` sanity check — multiple frames at `x:0, y:0` signals overlap.

### Recommended Layout Algorithm

```
cursorX = 40       // left margin
cursorY = 40       // top margin
rowHeight = 0      // tallest frame in current row
gap = 60           // spacing between frames
maxRowWidth = 1200 // wrap to next row after this

for each frame:
  if (cursorX + frame.width > maxRowWidth):
    cursorX = 40
    cursorY += rowHeight + gap
    rowHeight = 0
  create_node at parent
  update_node({ x: cursorX, y: cursorY })
  cursorX += frame.width + gap
  rowHeight = max(rowHeight, frame.height)

// New component category → force new row:
cursorX = 40
cursorY += rowHeight + gap + 40   // extra 40px category gap
rowHeight = 0
```

### Applies to ALL workflows

- **Usecase 1** (Bootstrap from URL) — after `bridge_move_node` into wrapper
- **Usecase 2** (Discover & Convert) — when building components from scratch
- **Usecase 3** (Read & Update) — when creating new sibling nodes
- **Any prompt that creates 2+ frames on the same parent**

---

## Usecase 2: Discover & Convert Components

Scan a Figma page → identify component candidates → convert to master components.

### Via Copilot Prompts

| Prompt | Tool |
|---|---|
| "List all layers on the current Figma page" | `bridge_list_layers` |
| "List all components on the current Figma page" | `bridge_list_components` |
| "Which layers should be converted to components?" | `bridge_list_layers` → suggest candidates |
| "Convert node 1:17 to a component named CounterCard" | `bridge_create_component({ nodeId, name })` |

### Conversion Rules

- ✅ `FRAME`, `GROUP`, `RECTANGLE` → can convert
- ❌ `TEXT`, `ELLIPSE`, `COMPONENT` → cannot convert (wrap TEXT in a frame first)

### Component Candidate Heuristics

Suggest conversion for frames/groups that:
- Are at depth 0–2 (top-level, meaningful UI blocks)
- Have names matching patterns: `Card`, `Button`, `Header`, `Toggle`, `Sidebar`, `Nav`, `Table`, `Chart`, `Footer`
- Are NOT already components

### Via Dashboard UI

Users can also use the web dashboard at `/dashboard`:
1. **Connect** → **Scan Layers** → reviews candidates with checkboxes
2. Select/rename → click **Convert N to Components**
3. View all components in the Components section

---

## Usecase 3: Read & Update Figma Nodes

Direct manipulation of Figma layers from Copilot.

| Action | Tool |
|---|---|
| Read node properties | `bridge_read_node({ nodeId })` |
| Update text content | `bridge_update_node({ nodeId, properties: { characters: "..." } })` |
| Update fills/colors | `bridge_update_node({ nodeId, properties: { fills: [...] } })` |
| Update dimensions | `bridge_update_node({ nodeId, properties: { width, height } })` |
| Update position | `bridge_update_node({ nodeId, properties: { x, y } })` |
| Delete a node | `bridge_delete_node({ nodeId })` |

---

## Usecase 4: Design Tokens (Variables)

| Action | Tool |
|---|---|
| Read all variables | `bridge_read_variables()` |
| Create a variable | `bridge_create_variable({ name, resolvedType, value })` |
| Update a variable | `bridge_update_variable({ variableId, value })` |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Playwright capture hangs | Use `Promise.race` with 60s timeout; poll captureId separately |
| Capture only shows banner / rest is blank | Site uses lazy-loading. Must slow-scroll full page, force eager images, resize viewport to full height before capture. See "Full-Page Capture" recipe above |
| Capture stuck on "pending" | Simpler URL, increase timeout, check no auth/paywall |
| Bridge not connected | `lsof -ti :9001 \| xargs kill -9; npm run bridge` |
| Plugin shows 🔴 | Restart bridge → re-open plugin in Figma |
| Components overlap after move | Always `bridge_update_node({ x, y })` before promoting |
| Components overlap after create | `bridge_create_node` defaults to `(0,0)`. Track a cursor and reposition each frame. See **"Preventing Frame Overlap"** section |
| `x`/`y` update silently ignored | `bridge_update_node` may return empty `"updated"` for position. Retry, or verify with `bridge_read_node` and re-issue |
| `x`/`y` update ignored (root cause) | Plugin used `'x' in node` which fails on Figma Proxy objects. Fixed to use type-based allowlist. Never use `in` operator for x/y — use `node.type` check instead |
| "Cannot convert TEXT" | Wrap text in a frame first, then convert the frame |
| Button/badge padding looks off after capture | This is auto-fixed by the plugin. `create-component` detects frames with `layoutMode:'NONE'` + padding >4px and enables auto-layout (HUG primary axis, FIXED counter axis, CENTER alignment). No manual fix needed — just re-componentize |
| Changes to code.ts / mcp-server.ts not taking effect | Must restart BOTH: reload the Figma plugin AND restart the bridge (`npm run bridge`). The bridge loads code at startup |

---

## Component Creation Best Practices

### Use the Real Library — Never Hand-Draw

**❌ Wrong:** Using `bridge_create_node` + `bridge_update_node` to manually build components with flat fills, hardcoded sizes, and approximate colors. This produces rectangles that don't look like the actual library.

**✅ Correct:** Create a Vite app, install the real library (shadcn/ui, MUI, etc.), render all variants in a showcase page, serve locally, and capture with `generate_figma_design`. The captured components preserve exact fonts, shadows, border-radius, padding, and all CSS.

### Naming Convention

Use ` / ` (space-slash-space) in component names to create **variant groups** in Figma's Assets panel:

```
Button / Default
Button / Destructive
Button / Outline
Badge / Default
Badge / Secondary
```

This groups variants together — matching how design systems organize them.

### Auto-Layout Fixup for Captured Frames

Figma's HTML-to-Design capture stores CSS padding as frame metadata but leaves `layoutMode: 'NONE'`. This means padding is **not visually applied** — the frame width equals content width only.

The plugin's `handleCreateComponent` automatically fixes this:
- Detects frames with `layoutMode: 'NONE'` and total padding > 4px
- Enables auto-layout (direction inferred from children arrangement)
- Sets **primary axis = HUG** (width expands to content + padding)
- Sets **counter axis = FIXED** (preserves explicit height, e.g., `h-10 = 40px`)
- Sets **counter-axis alignment = CENTER** (vertically centers content)
- Infers `itemSpacing` from gaps between children (for icon+text buttons)

This means `bridge_create_component` produces correctly-sized components out of the box — no post-fix needed.

**Threshold:** Only applied when `paddingLeft + paddingRight > 4` or `paddingTop + paddingBottom > 4`. Low-padding frames (e.g., cards with 1px border padding) are left untouched.

### Plugin Code — Never Use `in` Operator for Position

The Figma plugin API uses Proxy objects where `'x' in node` returns `false` even though `node.x` works. Always use type-based checks in `code.ts`:

```ts
// ✅ Correct — type-based check
if (node.type !== 'DOCUMENT' && node.type !== 'PAGE') { node.x = x; }

// ❌ Wrong — fails silently on Figma Proxy objects
if ('x' in node) { node.x = x; }
```

---

## File Reference

| File | Purpose |
|---|---|
| `.github/copilot-instructions.md` | This file — auto-read by Copilot |
| `.vscode/mcp.json` | MCP server configuration |
| `figma-plugin/code.ts` | Plugin handlers (create-page, move-node, update-node, etc.) |
| `src/mcp-server.ts` | MCP tool definitions for bridge commands |
| `src/server.ts` | WebSocket bridge server |
| `figma.config.json` | Project config (file key, root dir, patterns) |

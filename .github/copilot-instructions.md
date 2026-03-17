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

### Non-negotiable completion invariant
- For this repo, a request to create, bootstrap, sync, or update a **Figma component library** is not complete until the required Figma sync artifacts exist under `Figma/config/components` and mapping state exists under `Figma/config/.figma-sync`.
- `demo/` is a temporary showcase/capture helper only. It can support the workflow, but it never satisfies a Figma-library request by itself.
- If work only changed demo folders, the correct status is **partial progress**, not done.

---

## Global Style/Sync Rules (ALL workflows)

Apply these rules in **every use case** whenever a task reads, copies, compares, or syncs component style.

### Global source-of-truth order (ALWAYS)

1. `connections.json` = mapping index (which code component ↔ which Figma node)
2. `Figma/config/components/*.figma.ts` = local design contract (style snapshot)
3. Live Figma node (`bridge_read_node`) = current remote state

Never skip step 2 when a matching `.figma.ts` file exists.

### Project structure rule (ALWAYS)

Use this repo structure consistently:

```text
root/
  src/
    ...real product application code lives here
  Figma/
    bridge/
      src/
    plugin/
    docs/
    config/
      components/
        SomeComponent.figma.ts
      .figma-sync/
  src/
    ...development/runtime components live here
- `Figma/config/components/*.figma.ts` = authoritative Figma layer specs / design-contract files
- `src/` = real project/runtime UI components and application code
- `Figma/config/.figma-sync/` = mapping state such as `connections.json`
- `src/` = development/runtime UI components and application code
Never place runtime React components in `Figma/config/components/`.

Never place runtime React components in `Figma/config/components/`.
Never treat `src/` files as the authoritative Figma artifact when a matching `.figma.ts` spec should exist.

### Output location rule (ALWAYS)

For this repo, **Figma sync artifacts must live under `Figma/config`**:
- Component specs: `Figma/config/components/*.figma.ts`
- Spec index/exports: files under `Figma/config/components/`
- Mapping state: `Figma/config/.figma-sync/connections.json`

Runtime/product implementation code belongs under `src/`, not under `Figma/config/`.

`demo/` is a showcase/capture helper only. It is **not** the final implementation layer.
Never mark a task as complete if changes exist only in demo folders and no required files were created/updated under `Figma/config/components` and `Figma/config/.figma-sync`.

### Library detection rule (ALWAYS — before any scaffold or code generation)

Before writing any showcase code or installing packages:
1. Read the target folder's `package.json`
2. Identify the installed UI library from `dependencies`/`devDependencies`
3. **If library found → use it exactly. Do not substitute, approximate, or hand-roll styles.**
4. **If no library found → stop and ask the user** which library to use before proceeding

This applies in Usecase 1 (Prompt 1) and any task that generates component UI code.

### Standard style flow (any use case)

1. `bridge_list_component_specs` → check if spec already exists
2. If spec exists: `bridge_read_component_spec({ name })` and use that as first style reference
3. If spec missing:
  - `bridge_read_connections` → resolve component mapping
  - `bridge_read_node` (+ `bridge_read_variables` if token context needed)
  - generate `.figma.ts` and save via `bridge_save_component_spec`
4. For sync/apply operations:
  - read `.figma.ts`
  - diff against `bridge_read_node`
  - apply minimal updates via `bridge_update_node`

If a task is structural-only (e.g., scan/list/convert without style parity), keep workflow lightweight.

### Spec file requirement after componentization (ALWAYS)

After any `bridge_create_component` call that creates a new component:
1. Read the resulting node: `bridge_read_node({ nodeId })`
2. Generate a `.figma.ts` spec with the full style snapshot
3. Save it: `bridge_save_component_spec({ name, spec })` → `Figma/config/components/<Name>.figma.ts`
4. The spec file is the **source of truth** for all future re-sync operations

Never finish a componentization step without spec files saved for every promoted component.

### Usecase Index (Quick Navigation)

1. **Usecase 1** — Bootstrap Components from URL
2. **Usecase 2** — Discover & Convert Components

### Rule Index (Quick Navigation)

1. **Rule 1** — Read & Update Figma Nodes
2. **Rule 2** — Design Tokens (Variables)
3. **Rule 3** — Component Spec Layer Mechanics (`Figma/config/components/*.figma.ts`)

---

## Usecase 1: Bootstrap Components from URL

Create a Figma component library from any URL — external website or local dev server. The URL can be a live site (e.g., `https://ui.shadcn.com/examples/dashboard`) or a local project (e.g., `http://localhost:5173`).

If the user asks for a **Figma component library**, **bootstrap from URL**, **sync to Figma**, or similar end-state language, interpret that as the full workflow ending with saved specs under `Figma/config/components/` and saved mappings under `Figma/config/.figma-sync`, unless the user explicitly says showcase-only, capture-only, or step-by-step.

This workflow is designed to be completed in **3 prompts**.

### Prompt 1 — Build a Showcase App (skip for external URLs)

If the user wants a component library for a UI framework (shadcn/ui, MUI, Chakra, etc.), build a real app that renders all variants — **never hand-draw with `bridge_create_node`**.

**Use the `Figma/showcase` folder as a temporary capture template:**

1. **Scaffold a Vite + React app** in `Figma/showcase` (or reuse the existing one)
2. **Install the target component library** (e.g., `npx shadcn@latest add button card badge alert dialog`)
3. **Create a showcase page** (`Figma/showcase/src/App.tsx`) that renders every component variant in a clean grid:
  - One section per component type (Buttons, Badges, Cards, Alerts, etc.) — components must match exactly what the library exports (same props, same variants, same naming)
   - Show all variants side by side (Default, Destructive, Outline, Ghost, etc.)
   - Use the library's actual props — `<Button variant="destructive">`, not hand-rolled styles
  - For interactive/complex components (e.g., Dialog, Tabs, Dashboard), include explicit visible states in-page (open dialog preview, expanded tab panels, populated dashboard blocks) so capture does not depend on runtime clicks
   - White background, generous spacing, clear labels
4. **Serve locally** — `cd Figma/showcase && npm run dev` → `http://localhost:5173`

> Prompt 1 output is temporary showcase code for capture only. Final implementation is completed later in Prompt 3 by saving specs/mappings under `Figma/config/components` and `Figma/config/.figma-sync`.
> If Prompt 1 is the only completed step, report it as **showcase prepared** or **partial progress**. Do not say the Figma component library is done.

Showcase code may live in `Figma/showcase`, but long-lived development/runtime UI components belong in `src/`.

**⚠️ Detect the library BEFORE scaffolding:**

1. Read the target folder's `package.json` (e.g., `demo/package.json` or the project root)
2. Check `dependencies` and `devDependencies` for known UI libraries:
  - shadcn/ui indicators: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`
  - MUI: `@mui/material`
  - Chakra: `@chakra-ui/react`
  - etc.
3. **If a library is already installed → use it as-is. Do NOT re-install or switch to another library.**
4. **If no library is installed or it is unclear → ASK the user:**
  > "No UI library detected in package.json. Which library should I use? (e.g. shadcn/ui, MUI, Chakra UI, or other)"
5. **Never assume or pick a library without confirming.** Picking the wrong library produces components that don't match the codebase.

**Why this matters:** The captured result preserves exact fonts, shadows, border-radius, padding, and all CSS from the real library. Manual `bridge_create_node` produces flat rectangles.

### Prompt 2 — Capture the URL into Figma

**Tools:** `generate_figma_design` (Figma MCP), Playwright

**For local projects (localhost):**
1. `generate_figma_design({ outputMode: "existingFile", fileKey: "FILE_KEY" })` → returns captureId + browser URL
2. Write a Playwright `.cjs` script to open the capture URL against `http://localhost:5173`, run `captureForDesign()`, use `Promise.race` with 60s timeout
3. Poll: `generate_figma_design({ captureId: "..." })` every 5s until `"completed"`
4. Once capture is completed, stop **only if** the user explicitly asked for capture-only work or is intentionally following the tutorial prompt-by-prompt.
5. If the user asked for a Figma component library or end-to-end bootstrap, continue to Prompt 3 in the same turn whenever feasible.
6. **Important:** Capture is still intermediate progress. The full workflow is **NOT complete** until Prompt 3 runs and `.figma.ts` specs are saved.

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

Before style-sensitive conversion or updates, follow **Global Style/Sync Rules (ALL workflows)**.

**Step A — Read spec files before doing anything:**

1. List existing spec files: `bridge_list_component_specs` (or `ls Figma/config/components/`)
2. For each component to create:
  - If a matching `.figma.ts` spec exists → read it via `bridge_read_component_spec({ name })` and use it as the **authoritative reference** for component name, variant list, and properties
  - If no spec exists → proceed without it, then create one after promotion (see Step D)
3. **Never rename, skip, or restructure components in a way that contradicts an existing spec file**

**Step B — Promote frames to components:**

1. `bridge_list_layers()` → find captured frames, identify component candidates
2. `bridge_create_component({ nodeId, name })` × N → promote each to master component using `Category / Variant` naming that matches the spec (e.g., "Button / Default", "Badge / Secondary")
3. **Verify dimensions** — after each `bridge_create_component`, check the response: if `width !== originalWidth` or `height !== originalHeight`, immediately fix with `bridge_update_node({ nodeId, properties: { width: originalWidth } })`. Spot-check 2–3 components via `bridge_read_node` to confirm no drift.
4. Arrange components in a grid layout (see Layout Convention below)

**Step C — Save spec files for every newly created component:**

After promoting all frames, for each component:
1. `bridge_read_node({ nodeId })` → get the final node properties (dimensions, fills, layout, padding)
2. Generate a `.figma.ts` spec file with the full style snapshot
3. Save via `bridge_save_component_spec({ name, spec })` → writes `Figma/config/components/<ComponentName>.figma.ts`
4. This spec becomes the source of truth for all future sync operations

**Step D — Clean up and persist mappings:**

1. `bridge_delete_node()` → remove raw capture page
2. `bridge_save_connections()` → persist code-to-Figma mappings

**Step E — Completion gate (MANDATORY before saying "done"):**

1. Run `bridge_list_component_specs`
2. Confirm new spec files exist in `Figma/config/components/` for all promoted components (not just old files)
3. If any promoted component has no spec file, immediately generate and save it via `bridge_save_component_spec`
4. Confirm connections were persisted (`bridge_save_connections`) so mapping state is in `Figma/config/.figma-sync/connections.json`
5. Only mark the task complete after this check passes

If this gate is skipped, the workflow is considered incomplete.
If this gate fails, use **partial progress** wording and explicitly state which `Figma/config/components` or `Figma/config/.figma-sync` artifacts are still missing.

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
| 4 | *"End-to-end: build the showcase if needed, capture it, componentize it, save all specs under `Figma/config/components/`, save mappings under `Figma/config/.figma-sync`, and only then mark the task complete."* |

For external URLs, skip prompt 1 and use: *"Capture `https://example.com/page` into my Figma file (key: `FILE_KEY`). Use Playwright to handle lazy-loading — slow-scroll, force eager images, resize viewport. Poll until complete."*

### Usecase 1 — Definition of Done (must satisfy all)

- Showcase app is built with the **exact detected library** (or user-confirmed library if none detected)
- Capture is completed in Figma
- Frames are promoted to components
- `.figma.ts` spec files are saved in `Figma/config/components/` for every promoted component
- Connections are saved
- Changes are not limited to `demo/` only
- Final artifacts exist under `Figma/config` (including `Figma/config/.figma-sync` mappings), not only in demo folders

Missing `.figma.ts` files means the task is **not done**.

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
- **Rule 1** (Read & Update) — when creating new sibling nodes
- **Any prompt that creates 2+ frames on the same parent**

---

## Usecase 2: Discover & Convert Components

Scan a Figma page → identify component candidates → convert to master components.

Before any style copy/sync/update decisions, follow **Global Style/Sync Rules (ALL workflows)**.

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

## Rule 1: Read & Update Figma Nodes

For any style-affecting update, apply **Global Style/Sync Rules (ALL workflows)** first.

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

## Rule 2: Design Tokens (Variables)

| Action | Tool |
|---|---|
| Read all variables | `bridge_read_variables()` |
| Create a variable | `bridge_create_variable({ name, resolvedType, value })` |
| Update a variable | `bridge_update_variable({ variableId, value })` |

---

## Rule 3: Component Spec Layer Mechanics (`Figma/config/components/*.figma.ts`)

This section defines spec-file mechanics used by the global rules above.
Use these mechanics in any use case when style parity is required.

`.figma.ts` files are design-contract files for Figma sync, not runtime UI components. Runtime UI components belong under `src/`.

### Source-of-truth order (ALREADY GLOBAL)

1. `connections.json` = mapping index (which code component ↔ which Figma node)
2. `Figma/config/components/*.figma.ts` = local design contract (style snapshot)
3. Live Figma node (`bridge_read_node`) = current remote state

Never skip step 2 when a matching `.figma.ts` file exists.

### Standard flow for style-affecting tasks

1. `bridge_list_component_specs` → check if spec already exists
2. If spec exists: `bridge_read_component_spec({ name })` and use that as first style reference
3. If spec missing:
  - `bridge_read_connections` → resolve component mapping
  - `bridge_read_node` (+ `bridge_read_variables` if token context needed)
  - generate `.figma.ts` and save via `bridge_save_component_spec`
4. For "sync to Figma" requests:
  - read `.figma.ts`
  - diff against `bridge_read_node`
  - apply minimal updates via `bridge_update_node`

### Naming and file rules

- Spec file path: `Figma/config/components/<ComponentName>.figma.ts`
- Use TypeScript exports (`export const ButtonSpec = ...`) for IDE/Copilot readability
- Keep deterministic ordering in generated spec files to make git diffs clean
- Do not place React/Vue/runtime component implementations in `Figma/config/components/`; keep those in `src/`

### Prompt behavior requirement (global style-affecting tasks)

When a user asks to "copy style" (or any prompt depends on component style parity), Copilot should first read:
`Figma/config/components/<ComponentName>.figma.ts`

If not found, Copilot should create it from mapping + live Figma data, then proceed.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Playwright capture hangs | Use `Promise.race` with 60s timeout; poll captureId separately. If local capture still hangs/fails, ask the user to recheck/start the local server themselves first, confirm `http://localhost:5173` is reachable, then retry capture |
| Capture only shows banner / rest is blank | Site uses lazy-loading. Must slow-scroll full page, force eager images, resize viewport to full height before capture. See "Full-Page Capture" recipe above |
| Capture stuck on "pending" | Simpler URL, increase timeout, check no auth/paywall |
| Bridge not connected | `lsof -ti :9001 \| xargs kill -9; npm run bridge` |
| Plugin shows 🔴 | Restart bridge → re-open plugin in Figma |
| Components overlap after move | Always `bridge_update_node({ x, y })` before promoting |
| Components overlap after create | `bridge_create_node` defaults to `(0,0)`. Track a cursor and reposition each frame. See **"Preventing Frame Overlap"** section |
| `x`/`y` update silently ignored | `bridge_update_node` may return empty `"updated"` for position. Retry, or verify with `bridge_read_node` and re-issue |
| `x`/`y` update ignored (root cause) | Plugin used `'x' in node` which fails on Figma Proxy objects. Fixed to use type-based allowlist. Never use `in` operator for x/y — use `node.type` check instead |
| "Cannot convert TEXT" | Wrap text in a frame first, then convert the frame |
| Button/badge padding looks off after capture | Fixed in plugin. `create-component` saves original dimensions before setting `layoutMode` (which triggers relayout), then restores with `resize()` after all auto-layout props are applied. For `layoutMode:'NONE'` frames with padding >4px, it also enables auto-layout with HUG + FIXED and restores the counter-axis dimension. Check `originalWidth`/`originalHeight` in the response for drift |
| Component width shrank after create-component | Dimension drift — compare response `width` vs `originalWidth`. If different, fix with `bridge_update_node({ nodeId, properties: { width: originalWidth } })`. Root cause: `layoutMode` assignment triggers relayout before padding is applied |
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

#### Root Cause — Dimension Shrinkage

Setting `component.layoutMode` triggers an **immediate Figma relayout**. At that instant, padding/sizing properties haven't been copied yet (they're still at 0), so Figma recalculates the frame size based on bare content — shrinking it. This affects both branches:

#### Branch A — Frame Already Has Auto-Layout

When the original frame has `layoutMode: 'HORIZONTAL'` or `'VERTICAL'` (common for captured buttons/badges that already had auto-layout in HTML):

1. **Save** `savedWidth = frame.width` and `savedHeight = frame.height` *before* setting `component.layoutMode`
2. Copy `layoutMode`, then all auto-layout props (padding, spacing, sizing modes, alignment)
3. **Restore** with `component.resize(savedWidth, savedHeight)` *after* all props are set

This ensures the component keeps its exact original dimensions despite the intermediate relayout.

#### Branch B — Captured Frame With `layoutMode: 'NONE'` + Padding > 4px

When the capture stored CSS padding but didn't enable auto-layout:

1. Infer layout direction from children positions (`inferLayoutDirection`)
2. Enable auto-layout: `primaryAxisSizingMode = 'AUTO'` (HUG), `counterAxisSizingMode = 'FIXED'`
3. Copy padding values, set `counterAxisAlignItems = 'CENTER'`
4. Infer `itemSpacing` from gaps between children
5. **Safety net resize**: Restore the counter-axis dimension with `component.resize()` — this prevents the relayout from shrinking the non-flow dimension (e.g., button height for horizontal layout)

**Threshold:** Only applied when `paddingLeft + paddingRight > 4` or `paddingTop + paddingBottom > 4`. Low-padding frames are left untouched.

#### Response Fields for Drift Detection

`bridge_create_component` returns `originalWidth` and `originalHeight` alongside `width` and `height`. Compare them to detect drift:
- `width === originalWidth` → no shrinkage on width ✅
- `width < originalWidth` → dimension drift detected, issue `bridge_update_node({ width: originalWidth })` to correct

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
| `Figma/config/components/*.figma.ts` | Authoritative Figma layer specs / design-contract files |
| `src/` | Development/runtime UI components and application code |
| `Figma/config/.figma-sync/connections.json` | Mapping state between code and Figma |
| `.vscode/mcp.json` | MCP server configuration |
| `Figma/plugin/code.ts` | Plugin handlers (create-page, move-node, update-node, etc.) |
| `Figma/bridge/src/mcp-server.ts` | MCP tool definitions for bridge commands |
| `Figma/bridge/src/server.ts` | WebSocket bridge server |
| `Figma/config/figma.config.json` | Project config (file key, root dir, patterns) |

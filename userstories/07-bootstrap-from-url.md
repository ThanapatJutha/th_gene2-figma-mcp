# Epic 7: Bootstrap Figma Components from UI Library URL

> Give Copilot a UI library URL → capture high-fidelity HTML into Figma → promote the best layers to master components — across **two short prompt sessions**.

## Context

### The problem

A designer or developer starting a new project wants their Figma file to contain components that match a chosen UI library (MUI, Chakra UI, Ant Design, Shadcn, etc.). Today this requires manually recreating every component in Figma — buttons, inputs, cards, modals, etc. — which takes days of work.

### The solution — Capture then Componentize

Instead of hand-building Figma nodes one by one (poor layout fidelity), we leverage **`generate_figma_design`** from Figma's official MCP server to capture **real rendered HTML** as editable Figma layers. Then Copilot uses the custom bridge tools to inspect, reorganize, and promote the best layers into master components.

**Two-session approach:**

| Session | What happens | ~Tool calls | Duration |
|---------|-------------|-------------|----------|
| **Prompt 1** — Capture | Copilot picks the right URL(s), captures HTML into Figma via `generate_figma_design` | 5–8 | ~1 min |
| **Prompt 2** — Componentize | Copilot inspects captured layers, creates a Components page, moves + promotes selected frames, cleans up | 15–25 | ~2 min |

**Why two sessions instead of one?**

- Each session stays well within context window limits (~25–35 tool calls max)
- You get a **visual checkpoint** after Prompt 1 — you can inspect the capture in Figma and guide Prompt 2
- If Prompt 1 captures poorly (wrong URL, page didn't load), you can retry cheaply without losing Prompt 2 work
- Debugging is trivial — each session has a clear, verifiable outcome

### Key constraint: Components page

All promoted components must live on a **dedicated Figma page** (e.g. `📦 Components`), **not** the default page. This follows Figma best practices where:

- **Default page** = design compositions / screens
- **Components page** = the component library (master components)

### Architecture

```
                           Prompt 1 (Capture)                   Prompt 2 (Componentize)
                           ─────────────────                    ────────────────────────

User: "Capture the          Copilot:                            User: "Now inspect the
Shadcn dashboard from        │                                   captured page, create
this URL into Figma"         │ 1. fetch_webpage(url)             📦 Components page,
       │                     │    → find best showcase URL       promote Sidebar,
       ▼                     │                                   StatCard, etc."
   ┌────────┐                │ 2. generate_figma_design(         │
   │Copilot │                │      outputMode: "existingFile",  │ 1. bridge_list_layers
   │Agent   │                │      fileKey: "ghwHnq...")        │    → see captured tree
   │Mode    │                │    → captureId                    │
   └────────┘                │                                   │ 2. bridge_create_page
                             │ 3. Open browser + inject          │    → "📦 Components"
                             │    capture.js into URL            │
                             │                                   │ 2.5 bridge_create_node
                             │                                   │    → "Component Library" frame
                             │                                   │
                             │                                   │ 3. bridge_move_node ×N
                             │ 4. Poll until "completed"         │    → move frames into wrapper
                             ▼                                   │
                     ┌──────────────┐                            │ 3.5 bridge_update_node(x,y) ×N
                     │ Figma File   │                            │    → reposition in grid
                     │              │                            │
                     │ Captured Page│  ← editable frames,       │ 4. bridge_create_component ×N
                     │  (raw HTML)  │    text, auto-layout,     │    → promote to master
                     │              │    fills, radius           │
                     └──────────────┘                            │ 5. bridge_delete_node
                                                                 │    → remove raw capture page
                                                                 │
                                                                 │ 6. bridge_save_connections
                                                                 │    → persist mappings
                                                                 ▼
                                                         ┌───────────────────┐
                                                         │ Figma File        │
                                                         │                   │
                                                         │ Page 1            │
                                                         │  (designs)        │
                                                         │                   │
                                                         │ 📦 Components     │
                                                         │  └─ Component     │
                                                         │     Library       │ ← wrapper
                                                         │     ├─ Sidebar    │ ← master
                                                         │     ├─ StatCard   │ ← master
                                                         │     ├─ Chart      │ ← master
                                                         │     └─ Table      │ ← master
                                                         └───────────────────┘
```

### Why Capture > Direct Construction

| Aspect | Direct construction (old) | Capture then componentize (new) |
|--------|--------------------------|----------------------------------|
| **Layout fidelity** | ❌ No auto-layout, no x/y — children overlap at (0,0) | ✅ Real CSS → Figma auto-layout, flex, padding |
| **Typography** | ⚠️ LLM guesses font sizes/weights | ✅ Exact computed CSS fonts |
| **Colors** | ⚠️ LLM approximates from docs | ✅ Exact CSS computed colors |
| **Shadows, gradients** | ❌ Not supported by bridge | ✅ Captured from real rendering |
| **Tool calls** | 🔴 60–100+ (create + update every node) | 🟢 20–30 (capture + reorganize) |
| **Session count** | 1 long, risky session | 2 short, reliable sessions |

### Tools used

**Prompt 1 — Capture** (Figma official MCP):

| Tool | Used for |
|---|---|
| `fetch_webpage` (Copilot built-in) | Scrape the UI library to find the best showcase URL |
| `generate_figma_design` (Figma MCP) | Capture rendered HTML → editable Figma layers |

**Prompt 2 — Componentize** (Custom bridge MCP):

| Tool | Used for |
|---|---|
| `bridge_list_layers` | Inspect all captured layers on the page |
| `bridge_read_node` | Read details of specific frames (optional, for naming) |
| `bridge_create_page` | Create "📦 Components" page |
| `bridge_create_node` | Create "Component Library" wrapper frame to hold all components |
| `bridge_set_current_page` | Switch plugin to the new page |
| `bridge_move_node` | Move selected frames into the wrapper frame |
| `bridge_update_node` | Reposition moved frames in a grid layout (x/y) to prevent overlap |
| `bridge_create_component` | Promote frames to master components |
| `bridge_delete_node` | Remove leftover capture page/layers |
| `bridge_save_connections` | Persist component → code mappings |

### Bridge commands (implemented ✅)

| Command | Status | What it does |
|---|---|---|
| `create-page` | ✅ Done | Create a new Figma page with a given name |
| `set-current-page` | ✅ Done | Switch the plugin's active page |
| `move-node` | ✅ Done | Move a node from one parent (page) to another |

---

## Prompt Instructions (copy-paste ready)

### Prompt 1 — Capture

```
Capture the UI from {URL} into my existing Figma file.

Steps:
1. Use fetch_webpage to find the best component showcase page at {URL}
2. Use generate_figma_design with outputMode "existingFile" and
   fileKey "ghwHnqX2WZXFtfmsrbRLTg" to capture the page
3. Poll until the capture is completed
4. Tell me when it's done and what page was created
```

**Example with Shadcn:**

> _"Capture the UI from https://ui.shadcn.com/examples/dashboard into my existing Figma file (key: ghwHnqX2WZXFtfmsrbRLTg). Use generate_figma_design with outputMode existingFile."_

**Expected outcome:** A new page appears in Figma with editable layers captured from the URL.

### Prompt 2 — Componentize

```
Look at the captured page "{CAPTURED_PAGE_NAME}" in my Figma file.

Steps:
1. Use bridge_list_layers to see all captured layers
2. Identify the key UI components (e.g. Sidebar, StatCard, ChartCard,
   DataTable, Badge, Button, Input, Card)
3. Create a new page called "📦 Components" using bridge_create_page
4. Create a wrapper frame called "Component Library" on that page
   using bridge_create_node
5. For each identified component:
   a. Move it into the "Component Library" frame using bridge_move_node
   b. Reposition it using bridge_update_node with x/y (group small controls
      in a row, stat cards in a row, large cards stacked vertically)
   c. Rename it properly
   d. Promote it to a master component using bridge_create_component
6. Delete the original captured page using bridge_delete_node
7. Save connections using bridge_save_connections
8. Report a summary of what was created
```

**Example with Shadcn dashboard:**

> _"Inspect the captured dashboard page in Figma. Use bridge_list_layers to find the key components. Create a '📦 Components' page with a 'Component Library' wrapper frame. Move the Sidebar, 4 StatCards, ChartCard, DataTable, and any other good component candidates into it. Reposition in a grid, promote each to a master component, then delete the raw capture page."_

**Expected outcome:** A clean `📦 Components` page with a "Component Library" wrapper frame containing promoted master components.

### Optional Prompt 3+ — Iterate / Add More

If you want to capture additional component pages and add to the existing Components page:

> _"Capture https://ui.shadcn.com/docs/components/button into my Figma file. Then move the captured button variants to the existing 📦 Components page and promote them."_

This pattern is useful for:
- Adding individual component pages with more variants/states
- Capturing dark mode versions
- Adding components from a different library to the same file
- Building up a complete design system incrementally over several prompts

---

## Walkthrough: Shadcn Dashboard Example

### Prompt 1 — Capture the dashboard

**User says:**

> _"Capture https://ui.shadcn.com/examples/dashboard into my Figma file (key: ghwHnqX2WZXFtfmsrbRLTg) using generate_figma_design with existingFile mode."_

**Copilot does (~5 tool calls):**

```
1. fetch_webpage("https://ui.shadcn.com/examples/dashboard")
   → Confirms the URL has a rich component dashboard

2. generate_figma_design({
     outputMode: "existingFile",
     fileKey: "ghwHnqX2WZXFtfmsrbRLTg"
   })
   → Returns { captureId: "abc123..." }

3. Opens browser with capture.js injected
   (Playwright for external URL, or direct for localhost)

4. Polls: generate_figma_design({ captureId: "abc123" })
   → Poll 1: "pending"
   → Poll 2: "completed" ✅

5. Reports to user:
   "✅ Captured! A new page has been added to your Figma file.
    Open Figma to preview the captured layers, then start Prompt 2."
```

**User checks Figma** — sees a page with editable frames matching the real Shadcn dashboard. ✅ Checkpoint.

### Prompt 2 — Componentize

**User says:**

 > _"Now inspect the captured page in Figma. Create a '📦 Components' page with a wrapper frame called 'Component Library'. Identify the Sidebar, the 4 stat cards, the chart card, the data table, and any badges/buttons. Move each into the wrapper frame, reposition them in a clean grid, and promote to master components. Delete the raw capture page afterward."_

**Copilot does (~22 tool calls):**

```
1. bridge_list_layers()
   → Returns ~80 layers including:
     - Frame "Sidebar" (240×640)
     - Frame "StatCard" × 4 (280×140 each)
     - Frame "ChartCard" (600×360)
     - Frame "DataTable" (900×420)
     - Various text, nested frames, etc.

2. bridge_create_page({ name: "📦 Components" })
   → Returns { pageId: "80:1" }

3. bridge_create_node({ type: "FRAME", parentId: "80:1", name: "Component Library" })
   → Returns wrapper frame to hold all components

4. bridge_move_node × 7
   → Moves each component frame into the wrapper frame

5. bridge_update_node(x, y) × 7
   → Repositions components in a grid layout (prevents overlap)

6. bridge_create_component × 7
   → Promotes each to master component with proper name/description

7. bridge_delete_node → Removes the raw capture page

8. bridge_save_connections → Persists mappings

9. Reports summary table
```

---

## User Stories

### 7.1 — Discover best showcase URL from library

**As a** developer  
**I want** Copilot to figure out the best URL to capture from a UI library  
**So that** I get the most representative components in one capture  

**Acceptance Criteria:**
- [ ] Copilot fetches the library's site via `fetch_webpage`
- [ ] Identifies component showcase / example / kitchen-sink pages
- [ ] Picks the URL with the richest set of visible components
- [ ] Works with at least: Shadcn, MUI, Chakra UI, Ant Design

**Tasks:**
- [ ] Copilot uses `fetch_webpage` to scrape the main URL and find showcase links
- [ ] Copilot selects the best URL (e.g. `/examples/dashboard`, `/all-components/`)
- [ ] Falls back to the user-provided URL if no better option is found

---

### 7.2 — Capture HTML into Figma via generate_figma_design

**As a** developer  
**I want** the UI library page captured as editable Figma layers  
**So that** I get high-fidelity components with real CSS layout, fonts, and colors  

**Acceptance Criteria:**
- [ ] `generate_figma_design` called with `outputMode: "existingFile"` and project's `fileKey`
- [ ] Capture completes successfully (polled to `"completed"` status)
- [ ] Captured page appears in Figma with editable frames (not flattened images)
- [ ] Text layers are editable, fonts match the original CSS
- [ ] Colors, corner radius, padding match the original CSS
- [ ] Auto-layout is applied where the original used flexbox/grid

**Tasks:**
- [ ] Copilot calls `generate_figma_design` with correct parameters
- [ ] For external URLs: Copilot uses Playwright to inject `capture.js`
- [ ] Copilot polls `captureId` until `"completed"` (max 10 polls, 5s interval)
- [ ] User confirms captured page looks correct before Prompt 2

---

### 7.3 — Create Components page and promote captured frames

**As a** developer  
**I want** Copilot to inspect the captured layers, move the best frames to a Components page, and promote them to master components  
**So that** I have a clean, reusable component library in Figma  

**Acceptance Criteria:**
- [x] `bridge_list_layers` used to inspect all captured layers
- [x] Copilot identifies component-worthy frames (by name, size, structure)
- [x] `bridge_create_page` creates "📦 Components" page (id: 78:318)
- [x] A wrapper frame ("Component Library") is created on the Components page to hold all components
- [x] `bridge_move_node` moves selected frames into the wrapper frame
- [x] `bridge_create_component` promotes each frame to a master component (18 total)
- [x] Components are named properly (e.g. "Sidebar", "StatCard-Revenue", "ChartCard")
- [x] Components are repositioned in a non-overlapping grid layout using `bridge_update_node` x/y
- [x] Component descriptions include source library name ("Captured from Shadcn UI dashboard")

**Tasks:**
- [x] `create-page`, `set-current-page`, `move-node` bridge commands implemented
- [x] All three exposed as MCP tools
- [x] Copilot inspects layers and selects component candidates (18 total)
- [x] Copilot moves and promotes each selected frame
- [x] Verify promoted components appear in Figma Assets panel

---

### 7.4 — Clean up and save connections

**As a** developer  
**I want** the raw capture page deleted and component mappings saved  
**So that** the Figma file stays clean and future sync operations work  

**Acceptance Criteria:**
- [x] Raw capture page/layers cleaned up after componentization
- [x] `.figma-sync/connections.json` updated with 18 component links
- [x] Copilot reports a summary table: component name, Figma node, source
- [x] User can follow up with additional captures (Prompt 3+ pattern)

**Tasks:**
- [x] `bridge_delete_node` removes leftover capture layers
- [x] `bridge_save_connections` persists 18 component mappings
- [x] Summary report printed with component names, node IDs, descriptions

---

### 7.5 — Update documentation site

**As a** developer or contributor  
**I want** the Docusaurus docs site updated with this use case  
**So that** anyone can learn the capture-then-componentize workflow  

**Acceptance Criteria:**
- [x] New use case page `docs/docs/usecases/bootstrap-from-url.md` created
- [x] Bridge commands page `docs/docs/bridge/commands.md` updated with 3 new commands
- [x] Sidebar (`docs/sidebars.ts`) updated to include the new use case page
- [x] Docs site builds cleanly (`npx docusaurus build`)
- [x] Docs updated to reflect capture-then-componentize approach (not direct construction)
- [x] Multi-prompt session instructions included in docs

**Tasks:**
- [x] Created `docs/docs/usecases/bootstrap-from-url.md`
- [x] Updated `docs/docs/bridge/commands.md` with 3 new commands
- [x] Updated `docs/sidebars.ts`
- [x] Rewrite use case doc to describe the 2-session capture approach
- [x] Add copy-paste prompt templates to the docs

---

## Multi-Prompt Session Guide

### Why multiple prompts?

| Concern | Single prompt | Multiple prompts |
|---------|--------------|-----------------|
| **Context window** | ⚠️ 40+ tool calls risks overflow | ✅ 8–25 per session |
| **Reliability** | ❌ Failure midway = start over | ✅ Each session is independent |
| **Debugging** | Hard — can't inspect mid-flow | ✅ Visual checkpoint between sessions |
| **Flexibility** | None — all-or-nothing | ✅ Adjust Prompt 2 based on capture result |
| **Quality** | Same | Same (capture quality is identical) |

### Session budget estimates

| Scenario | Prompts | Total tool calls | Quality |
|----------|---------|-----------------|---------|
| 1 dashboard page → 5–7 components | 2 | ~25 | ✅ High |
| 3 component pages → 12+ components | 4 | ~50 | ✅ High |
| Full library (20+ components) | 5–6 | ~80 | ✅ High |
| One capture + componentize in 1 prompt | 1 | ~30 | ⚠️ Tight but possible for ≤5 components |

### Tips for best results

1. **Start with one rich page** — Dashboard or Kitchen Sink pages contain many components in one capture. Better than capturing individual pages.
2. **Inspect before componentizing** — After Prompt 1, open Figma and check the captured layers. Note which frames are component-worthy.
3. **Be specific in Prompt 2** — Name the exact components you want promoted. Copilot works better with explicit instructions than vague "find the components."
4. **Iterate** — Use Prompt 3+ pattern to add more component pages later. Each capture adds to the same Components page.
5. **One capture per prompt** — Don't ask Copilot to capture multiple URLs in one session. Each `generate_figma_design` call needs browser interaction + polling.

---

## New Bridge Commands Specification

### `create-page` (✅ Implemented)

```typescript
// Request
{ command: "create-page", payload: { name: "📦 Components" } }

// Response
{ success: true, data: { pageId: "42:1", name: "📦 Components" } }
```

**Plugin implementation:** `figma.createPage()` + set name.

### `set-current-page` (✅ Implemented)

```typescript
// Request
{ command: "set-current-page", payload: { pageId: "42:1" } }

// Response
{ success: true, data: { pageId: "42:1", name: "📦 Components" } }
```

**Plugin implementation:** `figma.setCurrentPageAsync(page)`.

### `move-node` (✅ Implemented)

```typescript
// Request
{ command: "move-node", payload: { nodeId: "50:1", targetParentId: "42:1" } }

// Response
{ success: true, data: { nodeId: "50:1", newParentId: "42:1" } }
```

**Plugin implementation:** `targetParent.appendChild(node)` — works across pages.

---

## Definition of Done

- [x] User can prompt Copilot with a UI library URL and get Figma components
- [x] Approach uses `generate_figma_design` to capture real HTML (not direct node construction)
- [x] Components live on a dedicated "📦 Components" page, **not** the default page
- [x] All components are inside a wrapper frame ("Component Library"), not loose on the page
- [x] At least one library (Shadcn) fully demonstrated end-to-end with 2-prompt flow
- [x] Bridge commands `create-page`, `set-current-page`, `move-node` implemented and tested
- [x] Raw capture page cleaned up after componentization
- [x] Connections saved in `.figma-sync/connections.json` (18 components)
- [x] Components are reusable master components (can create instances)
- [x] Components arranged in non-overlapping grid on 📦 Components page (via `bridge_update_node` x/y)
- [x] Docusaurus use case page created
- [x] Bridge commands doc updated with 3 new commands + MCP tools
- [x] Sidebar updated and docs site builds cleanly
- [x] Docs updated to reflect capture-then-componentize approach
- [x] Multi-prompt instructions documented

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

Capture a live website → extract components → build a Figma component library.

### Session 1 — Capture

**Tools:** `generate_figma_design` (Figma MCP)

1. `generate_figma_design({ outputMode: "existingFile", fileKey: "FILE_KEY" })` → returns captureId + browser URL
2. Open the capture URL in browser (or use Playwright)
3. Poll: `generate_figma_design({ captureId: "..." })` every 5s until `"completed"`

**Playwright option:** Write a temp `.cjs` script if you need custom viewport/selector. Use `Promise.race` with 60s timeout — `captureForDesign()` can hang but data uploads server-side. `*.cjs` files are git-ignored. Delete after use.

### Session 2 — Componentize (new prompt session)

**Tools:** Bridge MCP tools

1. `bridge_list_layers()` → find key components
2. `bridge_create_page({ name: "📦 Components" })` → new page
3. `bridge_create_node({ type: "FRAME", parentId: pageId, name: "Component Library" })` → wrapper frame
4. `bridge_move_node()` × N → move frames into wrapper
5. `bridge_update_node({ x, y })` × N → reposition in grid (see layout below)
6. `bridge_create_component()` × N → promote to master components
7. `bridge_delete_node()` → remove raw capture page
8. `bridge_save_connections()` → persist mappings

**⚠️ Critical:** `bridge_move_node` retains original x/y → components overlap. Always reposition with `bridge_update_node` before promoting.

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
| Capture stuck on "pending" | Simpler URL, increase timeout, check no auth/paywall |
| Bridge not connected | `lsof -ti :9001 \| xargs kill -9; npm run bridge` |
| Plugin shows 🔴 | Restart bridge → re-open plugin in Figma |
| Components overlap after move | Always `bridge_update_node({ x, y })` before promoting |
| "Cannot convert TEXT" | Wrap text in a frame first, then convert the frame |

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

---
sidebar_position: 2
slug: /usecases/discover-components
---

# Discover & Convert Components

Use the **Discover** page to scan your Figma file, review which layers should become components, and convert them — all from your browser.

## The Flow

```
Step 1: Scan           Step 2: Review          Step 3: Convert         Step 4: View
───────────────        ────────────────        ────────────────        ────────────────
Fetch all layers  →    AI suggests which   →   Confirm & convert  →   See all components
from Figma             should be components    selected layers        on Components page
```

### Step 1 — Scan all layers

Open the [Dashboard](/figma-sync/dashboard) and click **Connect**, then **🔍 Scan Layers**.

The plugin reads every layer on the current Figma page and sends the full list to the browser. Each layer includes:

- **Name, type, node ID** — identification
- **Dimensions & child count** — structure info
- **`canConvert`** — whether it's a FRAME/GROUP/RECTANGLE that can become a component
- **`isComponent`** — whether it's already a component

### Step 2 — Review suggestions

The page automatically highlights **suggested component candidates** using heuristics:

| Heuristic | Why |
|---|---|
| Frame/Group with children at depth 0–2 | Top-level frames are usually meaningful UI blocks |
| Name matches common patterns (`Card`, `Button`, `Header`, `Toggle`, etc.) | Named like components = probably should be components |
| Not already a component | Skip nodes that are already ◆ |

Layers that match are **pre-selected** with checkboxes. You can:

- ✅ **Select/deselect** individual layers
- ✏️ **Rename** the component name before converting
- 🔍 **Filter** by Suggested, Convertible, Components, or All

### Step 3 — Convert selected

Click the purple **"Convert N to Components"** button. For each selected layer, the page sends a `create-component` command through the bridge → plugin converts it in Figma.

Results appear inline:

```
✅ HeaderCard (2:100)
✅ CounterCard (2:101)
❌ SomeLayer: Cannot convert TEXT to component
```

After conversion, the layer list refreshes automatically.

### Step 4 — View components

Check the **Components** section on the [Dashboard](/figma-sync/dashboard) to see all existing components on the current Figma page:

- Live data fetched from Figma via the bridge
- Card grid with name, node ID, size, description
- **Open in Figma** links to jump to each component
- Filterable by name or ID

## Prerequisites

All of these must be running:

| Requirement | How |
|---|---|
| Bridge server | `npm run bridge` |
| Figma plugin open | Plugins → Development → Figma Sync Bridge |
| Plugin shows 🟢 Connected | Verify in the plugin UI |

## Copilot Prompts

You can also trigger these flows via Copilot prompts instead of the UI:

| Prompt | What happens |
|---|---|
| *"List all layers on the current Figma page"* | Calls `bridge_list_layers` |
| *"List all components on the current Figma page"* | Calls `bridge_list_components` |
| *"Which layers should be converted to components?"* | Calls `bridge_list_layers` + Copilot suggests candidates |
| *"Convert node 1:17 to a component named CounterCard"* | Calls `bridge_create_component` |

## Architecture

```
Browser (Discover / Components page)
  │ new WebSocket('ws://localhost:9001')
  ▼
Bridge WebSocket Server (port 9001)
  │ relays to plugin
  ▼
Figma Plugin (sandbox)
  │ figma.currentPage.findAll()
  │ figma.createComponent()
  ▼
Figma File (live updates)
```

The browser connects to the bridge as a **client** (same as MCP/Copilot). The bridge routes `list-layers` / `list-components` / `create-component` commands to the plugin and returns responses.

:::info Local only
These pages only work when the bridge is running locally. The deployed docs site at `https://patja60.github.io/figma-sync/` will show a "Bridge not connected" state — this is expected. The pages are developer tools, not production dashboards.
:::

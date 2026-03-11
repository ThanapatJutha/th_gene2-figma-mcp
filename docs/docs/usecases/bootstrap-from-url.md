---
sidebar_position: 3
slug: /usecases/bootstrap-from-url
---

# Bootstrap Figma Components from a UI Library URL

Start from an **empty Figma file**, give Copilot a URL like `https://mui.com` or `https://chakra-ui.com`, and let it build a full component library inside Figma — all through the Bridge.

## The Flow

```
Step 1: Scrape            Step 2: Create Page      Step 3: Build           Step 4: Register
──────────────            ─────────────────        ────────────            ────────────────
Copilot reads the    →    Create a dedicated  →    For each component  →   Convert frames
UI library docs            "📦 Components" page     build FRAME + TEXT      to master components
and extracts info         and switch to it          nodes in Figma          via create-component
```

### Step 1 — Copilot scrapes the library

When you provide a URL, Copilot:

1. Fetches the documentation / component catalogue page.
2. Extracts a list of **component names**, props, and visual descriptions (colours, typography, spacing).
3. Builds an internal plan of which components to create and what they should look like.

No local project is needed — Copilot works entirely from the remote docs.

### Step 2 — Create a Components page

Rather than dumping components on the default page, Copilot calls:

1. **`bridge_create_page`** with `name: "📦 Components"` → returns a new `pageId`.
2. **`bridge_set_current_page`** with that `pageId` → all subsequent commands target the new page.

This keeps the Figma file organised from the start.

### Step 3 — Build component frames

For each component (e.g. Button, Card, TextField), Copilot uses existing bridge tools:

| Bridge Tool | What it does |
|---|---|
| `bridge_create_node` | Create the outer FRAME with layout, padding, fills |
| `bridge_create_node` (TEXT) | Add labels, placeholders, and text content |
| `bridge_update_node` | Fine-tune fills, corner radius, strokes, typography |

Copilot spaces components across the canvas (e.g. 300 px apart) so they don't overlap.

### Step 4 — Register as master components

Once a frame is built and looks correct, Copilot calls **`bridge_create_component`** to convert it into a reusable master component. This means:

- The component appears in the Figma **Assets** panel.
- Other pages can create **instances** of it.
- Future push-sync can update it in place.

## New Bridge Commands

Three commands were added specifically for this workflow:

| Command | Purpose |
|---|---|
| `create-page` | Create a new Figma page with a given name |
| `set-current-page` | Switch the plugin's active page so subsequent commands target it |
| `move-node` | Move a node to a different parent (page or frame), even across pages |

See the full reference in [Commands & MCP Tools](/docs/bridge/commands).

## Prerequisites

| Requirement | How |
|---|---|
| Bridge server | `npm run bridge` |
| Figma plugin open | Plugins → Development → Figma Sync Bridge |
| Plugin shows 🟢 Connected | Verify in the plugin UI |
| Copilot Agent Mode | Open VS Code Chat → select Agent mode |

## Copilot Prompts

Try these prompts in Agent Mode:

| What you want | Prompt |
|---|---|
| Bootstrap MUI | *"I want to create Figma components from https://mui.com/material-ui/all-components/. Create a Components page and build Button, Card, and TextField."* |
| Bootstrap Chakra | *"Scrape https://chakra-ui.com/docs/components and create Figma master components for each one on a new 📦 Components page."* |
| Single component | *"Read the docs at https://ant.design/components/button and create a matching Figma component on a new page."* |
| Move to page | *"Move node 50:1 to the 📦 Components page (42:1)."* |

## Behind the Scenes

```
User prompt
   │
   ▼
Copilot (LLM)
   │  1. fetch_webpage(url)           → scrape component list
   │  2. bridge_create_page("📦 …")  → pageId
   │  3. bridge_set_current_page(id)  → switch
   │  4. For each component:
   │     a. bridge_create_node(FRAME) → outer frame
   │     b. bridge_create_node(TEXT)  → labels / content
   │     c. bridge_update_node(…)     → styling
   │     d. bridge_create_component(…)→ promote to master
   ▼
Figma file now has a "📦 Components" page
with master components ready to use.
```

# Epic 7: Bootstrap Figma Components from UI Library URL

> Start from an empty project and populate a Figma file with reusable components built directly via the Plugin Bridge — all driven by a single Copilot prompt.

## Context

### The problem

A designer or developer starting a new project wants their Figma file to contain components that match a chosen UI library (MUI, Chakra UI, Ant Design, Shadcn, etc.). Today this requires manually recreating every component in Figma — buttons, inputs, cards, modals, etc. — which takes days of work.

### The solution

The user gives Copilot a URL (e.g. `https://mui.com`) and a prompt like:

> _"Create Figma components based on this UI library: https://mui.com"_

Copilot then:

1. Fetches the library's documentation to discover its component catalog
2. Creates a dedicated **"📦 Components"** page in the Figma file via the Plugin Bridge
3. For each selected component, **directly builds** the Figma node tree (frames, text, colors, auto-layout) using bridge commands
4. Promotes each top-level frame into a reusable Figma **master component**
5. Saves connections to `.figma-sync/connections.json`

**No local React app needed.** Copilot uses its knowledge of the UI library (from docs + LLM knowledge) to construct the visual structure directly in Figma.

### Key constraint: Components page

All generated components must live on a **dedicated Figma page** (e.g. `📦 Components`), **not** the default page. This follows Figma best practices where:

- **Default page** = design compositions / screens
- **Components page** = the component library (master components)

### Architecture

```
User prompt                          Figma File
  │                                     │
  │ "Create Figma components            │
  │  from https://mui.com"              │
  │                                     │
  ▼                                     ▼
┌────────────────────────────────────────────────────────────┐
│                     COPILOT (Agent Mode)                   │
│                                                            │
│  1. fetch_webpage(url)         → component catalog         │
│  2. bridge: create-page        → "📦 Components" page      │
│  3. bridge: set-current-page   → switch to Components page │
│  4. For each component:                                    │
│     a. bridge: create-node     → build frame structure     │
│     b. bridge: create-node     → add text, sub-frames      │
│     c. bridge: update-node     → set fills, radius, etc.   │
│     d. bridge: create-component→ promote to master comp    │
│  5. bridge: save-connections   → persist mappings           │
│                                                            │
└────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │   Figma File     │
                               │                  │
                               │  Page 1 (default)│
                               │    (empty/screens)│
                               │                  │
                               │  📦 Components   │
                               │    ├─ Button     │ ← master component
                               │    ├─ Card       │ ← master component
                               │    ├─ TextField  │ ← master component
                               │    └─ Alert      │ ← master component
                               └─────────────────┘
```

### Approach: Direct Figma construction via Bridge

Instead of capturing a running web app, Copilot **constructs each component directly** in Figma using existing bridge commands:

| Step | Bridge command | Purpose |
|------|---------------|---------|
| Create container frame | `create-node (FRAME)` | Outer frame with auto-layout, padding, fills |
| Add text labels | `create-node (TEXT)` | Button text, card titles, input labels |
| Style the frame | `update-node` | Set fills (colors), corner radius, strokes, padding |
| Add child variants | `create-node (FRAME)` | Nested frames for different states/sizes |
| Promote to component | `create-component` | Convert frame → master component |

**Why this works:**
- The bridge already supports `create-node`, `update-node`, and `create-component` — no new write commands needed for the nodes themselves
- Copilot's LLM knowledge knows what MUI Button looks like (blue `#1976d2`, 36px height, 8px radius, "Inter" font, etc.)
- The `fetch_webpage` step supplements LLM knowledge with exact colors, sizes, and typography from the library docs

### New bridge commands needed (page management only)

| Command | What it does | Where |
|---|---|---|
| `create-page` | Create a new Figma page with a given name | Plugin |
| `set-current-page` | Switch the plugin's active page | Plugin |
| `move-node` | Move a node from one parent (page) to another | Plugin |

### Existing tools used

| Tool | Used for |
|---|---|
| `fetch_webpage` (Copilot built-in) | Scrape the UI library docs for colors, sizes, tokens |
| `bridge_create_node` | Build frame/text nodes directly in Figma |
| `bridge_update_node` | Set fills, corner radius, padding, strokes, font |
| `bridge_create_component` | Promote built frames → master components |
| `bridge_save_connections` | Persist code ↔ Figma component links |
| `bridge_list_layers` | Verify what was created |
| `bridge_read_config` | Get Figma file key |

---

## Walkthrough Flow

### Phase 0 — User prompt

The user opens VS Code with a project and types:

> _"Create Figma components based on this UI library: https://mui.com"_

Or with more specificity:

> _"Create Figma components for Button, Card, TextField, and Alert from MUI (https://mui.com). Put them on a Components page."_

---

### Phase 1 — Discover component catalog & design tokens

**Goal:** Understand which components the library offers and extract design tokens (colors, typography, sizes).

```
Copilot internally:

1. fetch_webpage("https://mui.com/material-ui/all-components/")
   → Scrapes the component catalog page
   → Extracts component list: Button, Card, TextField, Alert, ...

2. fetch_webpage("https://mui.com/material-ui/customization/default-theme/")
   → Extracts design tokens:
     - Primary: #1976d2
     - Secondary: #9c27b0
     - Error: #d32f2f
     - Success: #2e7d32
     - Font: Roboto, 14px base
     - Border radius: 4px
     - Spacing unit: 8px

3. Copilot presents the list to the user:

   "I found MUI Material components. Here are the most common ones:
   
   | # | Component   | Category    |
   |---|-------------|-------------|
   | 1 | Button      | Inputs      |
   | 2 | TextField   | Inputs      |
   | 3 | Select      | Inputs      |
   | 4 | Checkbox    | Inputs      |
   | 5 | Card        | Surfaces    |
   | 6 | Alert       | Feedback    |
   | 7 | Dialog      | Feedback    |
   | 8 | Chip        | Data Display|
   | 9 | Avatar      | Data Display|
   |10 | Tabs        | Navigation  |
   
   Which components should I create in Figma? 
   (e.g. 'all', '1-6', or 'Button, Card, Alert')"
```

**User responds:** _"Create 1, 2, 5, and 6"_ → Button, TextField, Card, Alert

---

### Phase 2 — Create Components page in Figma

**Goal:** Set up the dedicated Components page before building anything.

```
Copilot internally:

Step 2a — Read project config:

→ bridge_read_config()
   → { figmaFileKey: "ghwHnqX2WZXFtfmsrbRLTg", rootDir: "demo", ... }

Step 2b — Create the Components page:

→ bridge: create-page({ name: "📦 Components" })
   → returns { pageId: "42:1", name: "📦 Components" }

Step 2c — Switch plugin to the new page:

→ bridge: set-current-page({ pageId: "42:1" })
   → plugin now targets the Components page for all subsequent commands

Copilot confirms:
  "Created '📦 Components' page in your Figma file. Building components now..."
```

---

### Phase 3 — Build each component directly in Figma

**Goal:** For each selected component, construct the visual node tree directly using bridge commands.

This is the core of the flow. Copilot uses its LLM knowledge + fetched design tokens to build each component as a structured Figma frame.

#### Example: Building a MUI Button

```
Copilot internally:

Step 3a — Create the container frame on the Components page:

→ bridge_create_node({
    type: "FRAME",
    parentId: "42:1",           ← the 📦 Components page ID
    name: "Button",
    properties: {
      width: 400,
      height: 200,
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0 }]
    }
  })
  → returns { id: "50:1", name: "Button", ... }

Step 3b — Create a "Contained" variant button:

→ bridge_create_node({
    type: "FRAME",
    parentId: "50:1",
    name: "Contained",
    properties: {
      width: 120,
      height: 36,
      fills: [{ type: "SOLID", color: { r: 0.098, g: 0.463, b: 0.824 } }]
              ← #1976d2 (MUI primary)
    }
  })
  → returns { id: "50:2" }

→ bridge_update_node({
    nodeId: "50:2",
    properties: { cornerRadius: 4, paddingLeft: 16, paddingRight: 16,
                  paddingTop: 8, paddingBottom: 8 }
  })

→ bridge_create_node({
    type: "TEXT",
    parentId: "50:2",
    name: "Label",
    properties: {
      characters: "BUTTON",
      fontSize: 14,
      fontName: { family: "Inter", style: "Medium" }
    }
  })
  → returns { id: "50:3" }

Step 3c — Create an "Outlined" variant:

→ bridge_create_node({
    type: "FRAME",
    parentId: "50:1",
    name: "Outlined",
    properties: {
      width: 120,
      height: 36,
      fills: []                 ← transparent
    }
  })
  → returns { id: "50:4" }

→ bridge_update_node({
    nodeId: "50:4",
    properties: {
      cornerRadius: 4,
      strokeWeight: 1,
      strokes: [{ type: "SOLID", color: { r: 0.098, g: 0.463, b: 0.824 } }],
      paddingLeft: 16, paddingRight: 16,
      paddingTop: 8, paddingBottom: 8
    }
  })

→ bridge_create_node({
    type: "TEXT",
    parentId: "50:4",
    name: "Label",
    properties: {
      characters: "BUTTON",
      fontSize: 14,
      fontName: { family: "Inter", style: "Medium" }
    }
  })

Step 3d — Create a "Text" variant:

→ (similar pattern with no fills, no stroke, just text)

Step 3e — Promote to master component:

→ bridge_create_component({
    nodeId: "50:1",
    name: "Button",
    description: "MUI Button — contained, outlined, text variants. Primary color: #1976d2."
  })
  → returns { id: "50:1", type: "COMPONENT" }
```

#### Example: Building a MUI Card

```
Copilot internally:

→ bridge_create_node({
    type: "FRAME",
    parentId: "42:1",
    name: "Card",
    properties: { width: 345, height: 260, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] }
  })
  → returns { id: "60:1" }

→ bridge_update_node({
    nodeId: "60:1",
    properties: { cornerRadius: 4, strokeWeight: 1,
                  strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.12 }] }
  })

→ bridge_create_node({
    type: "TEXT", parentId: "60:1", name: "Title",
    properties: { characters: "Card Title", fontSize: 20, fontName: { family: "Inter", style: "Medium" } }
  })

→ bridge_create_node({
    type: "TEXT", parentId: "60:1", name: "Content",
    properties: { characters: "Card content body text goes here.\nSupports multiple lines.", fontSize: 14,
                  fontName: { family: "Inter", style: "Regular" } }
  })

→ bridge_create_node({
    type: "FRAME", parentId: "60:1", name: "Actions",
    properties: { width: 345, height: 48, fills: [] }
  })
  → returns { id: "60:4" }

→ bridge_create_node({
    type: "TEXT", parentId: "60:4", name: "Action Button",
    properties: { characters: "LEARN MORE", fontSize: 14, fontName: { family: "Inter", style: "Medium" } }
  })

→ bridge_create_component({
    nodeId: "60:1",
    name: "Card",
    description: "MUI Card — surface container with title, content, and actions area."
  })
```

#### Example: Building a MUI Alert

```
Copilot internally:

→ Create outer frame "Alert" on Components page (42:1)
   width: 400, height: 200

→ Create "Success" variant frame:
   fills: [{ type: "SOLID", color: { r: 0.929, g: 0.973, b: 0.937 } }]  ← #edf7ed
   cornerRadius: 4, padding: 8/16
   → Add text: "This is a success alert — check it out!"
     color: { r: 0.11, g: 0.38, b: 0.16 }  ← #1e4620

→ Create "Error" variant frame:
   fills: [{ type: "SOLID", color: { r: 0.992, g: 0.929, b: 0.933 } }]  ← #fdeded
   → Add text: "This is an error alert — check it out!"

→ Create "Warning" variant frame
→ Create "Info" variant frame

→ Promote to component:
   bridge_create_component({ nodeId: ..., name: "Alert",
     description: "MUI Alert — success, error, warning, info severity levels." })
```

**Copilot builds all 4 components sequentially, reporting progress:**

> _"Building Button... ✅ Done (3 variants)_  
> _Building TextField... ✅ Done (2 variants)_  
> _Building Card... ✅ Done_  
> _Building Alert... ✅ Done (4 variants)"_

---

### Phase 4 — Save connections & report

**Goal:** Persist the component mappings and give the user a summary.

```
Copilot:

→ bridge_save_connections({
    connections: [
      { figmaNodeId: "50:1",  figmaComponentName: "Button",    codeComponent: "Button",    file: "—", linkedAt: "2026-03-12T..." },
      { figmaNodeId: "55:1",  figmaComponentName: "TextField", codeComponent: "TextField", file: "—", linkedAt: "2026-03-12T..." },
      { figmaNodeId: "60:1",  figmaComponentName: "Card",      codeComponent: "Card",      file: "—", linkedAt: "2026-03-12T..." },
      { figmaNodeId: "65:1",  figmaComponentName: "Alert",     codeComponent: "Alert",     file: "—", linkedAt: "2026-03-12T..." },
    ]
  })

→ Report to user:

  "✅ Created 4 Figma master components on the **📦 Components** page:

  | Component | Figma Node | Variants                             |
  |-----------|-----------|--------------------------------------|
  | Button    | 50:1      | Contained, Outlined, Text            |
  | TextField | 55:1      | Outlined, Filled                     |
  | Card      | 60:1      | Title + Content + Actions            |
  | Alert     | 65:1      | Success, Error, Warning, Info        |

  Design tokens used:
  - Primary: #1976d2  |  Secondary: #9c27b0
  - Font: Inter  |  Border radius: 4px
  - Spacing: 8px grid

  [Open in Figma ↗](https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg)

  You can now:
  - Use these as master components in your Figma designs
  - Ask me to add more components
  - Ask me to update colors/sizes to match a different theme"
```

---

## User Stories

### 7.1 — Discover components from UI library URL

**As a** developer  
**I want to** give Copilot a UI library URL and have it list available components  
**So that** I can choose which components to create in Figma  

**Acceptance Criteria:**
- [ ] Copilot fetches the library's component catalog page via `fetch_webpage`
- [ ] Combines scraped info with LLM knowledge of the library
- [ ] Presents a categorized list of components to the user
- [ ] User can select specific components or "all"
- [ ] Works with at least: MUI, Chakra UI, Ant Design, Shadcn

**Tasks:**
- [ ] Identify the common component catalog URL patterns for major libraries
- [ ] Use `fetch_webpage` to scrape and extract component names + design tokens
- [ ] Present structured list to user for selection
- [ ] Document supported libraries and their catalog URLs

---

### 7.2 — Create dedicated Components page in Figma

**As a** developer  
**I want** Figma components to be created on a dedicated page (e.g. "📦 Components")  
**So that** the Figma file follows best practices with a clean component library page  

**Acceptance Criteria:**
- [ ] New bridge command `create-page` creates a named Figma page
- [ ] New bridge command `set-current-page` switches the plugin's active page
- [ ] New bridge command `move-node` moves a node between pages/parents
- [ ] All three commands exposed as MCP tools
- [ ] Components page is created before any component frames

**Tasks:**
- [ ] Add `create-page` handler in `figma-plugin/code.ts`
- [ ] Add `set-current-page` handler in `figma-plugin/code.ts`
- [ ] Add `move-node` handler in `figma-plugin/code.ts`
- [ ] Add `CreatePagePayload`, `SetCurrentPagePayload`, `MoveNodePayload` types to `src/protocol.ts`
- [ ] Register as plugin commands in `src/server.ts`
- [ ] Expose as MCP tools in `src/mcp-server.ts`

---

### 7.3 — Build Figma components directly via bridge

**As a** developer  
**I want** Copilot to construct each UI component directly in Figma using bridge commands  
**So that** components are built with the correct structure, colors, and typography without needing a local showcase app  

**Acceptance Criteria:**
- [ ] Each component is built as a frame with proper auto-layout, fills, typography
- [ ] Design tokens from the library (colors, radius, font) are accurately applied
- [ ] Components include key variants (e.g. Button: contained, outlined, text)
- [ ] Each top-level frame is promoted to a master component via `bridge_create_component`
- [ ] Components are named correctly (e.g. "Button", "Card", not "Frame 42")
- [ ] Component descriptions include variant info and library name

**Tasks:**
- [ ] Copilot uses `bridge_create_node` (FRAME/TEXT) to build node trees
- [ ] Copilot uses `bridge_update_node` to set fills, corner radius, padding, strokes
- [ ] Copilot uses `bridge_create_component` to promote frames
- [ ] Verify components are properly structured in Figma
- [ ] Verify components can be instantiated (create instances from master)

---

### 7.4 — Save connections & report summary

**As a** developer  
**I want** the component mappings saved and a clear summary shown  
**So that** I know what was created and future sync operations work  

**Acceptance Criteria:**
- [ ] `.figma-sync/connections.json` updated with new component links
- [ ] Copilot reports a summary table: component name, Figma node, variants
- [ ] Copilot reports design tokens used (colors, font, radius)
- [ ] User can follow up to add more components or modify existing ones

**Tasks:**
- [ ] Call `bridge_save_connections` with new component mappings
- [ ] Print summary table with component names, node IDs, and variant info
- [ ] Include Figma file link in summary

---

### 7.5 — Update documentation site

**As a** developer or contributor  
**I want** the Docusaurus docs site updated with this new use case  
**So that** anyone can learn how to bootstrap Figma components from a UI library URL  

**Acceptance Criteria:**
- [ ] New use case page `docs/docs/usecases/bootstrap-from-url.md` created
- [ ] Bridge commands page `docs/docs/bridge/commands.md` updated with 3 new commands
- [ ] Sidebar (`docs/sidebars.ts`) updated to include the new use case page
- [ ] Docs site builds cleanly (`npx docusaurus build`)

**Tasks:**

#### 7.5.1 — New use case doc: `docs/docs/usecases/bootstrap-from-url.md`

Content structure:

```markdown
---
sidebar_position: 3
slug: /usecases/bootstrap-from-url
---
# Bootstrap Components from UI Library

## Why?
- Start from empty Figma file
- Populate with components matching a UI library

## Prerequisites
- Bridge server running
- Figma plugin connected
- Figma file key configured in figma.config.json

## How to Prompt
- Minimal: "Create Figma components based on https://mui.com"
- Specific: "Create Button, Card, Alert from Chakra UI"
- Add more: "Add TextField to the Components page"
- Custom theme: "Create Button from Shadcn with zinc dark theme"

## What Happens Behind the Scenes
- Phase 1: Discover (fetch_webpage → component list)
- Phase 2: Create page (create-page → set-current-page)
- Phase 3: Build components (create-node → update-node → create-component)
- Phase 4: Save & report (save-connections → summary)

## Supported Libraries
- MUI, Chakra UI, Ant Design, Shadcn (and any library Copilot knows)

## Tips
- Start with 3–5 components, add more later
- Check the 📦 Components page in Figma after each run
- Components are master components — you can create instances from them
```

#### 7.5.2 — Update commands doc: `docs/docs/bridge/commands.md`

Add 3 new plugin write commands to the existing tables:

| Command | Purpose |
|---|---|
| `create-page` | Create a new Figma page with a given name |
| `set-current-page` | Switch the plugin's active page for subsequent commands |
| `move-node` | Move a node from one parent/page to another |

Add 3 new MCP tools to the Plugin Tools table:

| MCP Tool | Bridge Command | Description |
|---|---|---|
| `bridge_create_page` | `create-page` | Create a new named Figma page |
| `bridge_set_current_page` | `set-current-page` | Switch plugin's active page |
| `bridge_move_node` | `move-node` | Move a node to a different parent/page |

Add example prompts:

| What you want | Prompt |
|---|---|
| Create components page | *"Create a new Figma page called Components"* |
| Bootstrap from URL | *"Create Figma components based on https://mui.com"* |
| Move to page | *"Move node 50:1 to the Components page"* |

#### 7.5.3 — Update sidebar: `docs/sidebars.ts`

Add `'usecases/bootstrap-from-url'` to the Usecases category items array.

---

## Example Prompts

### Minimal prompt

> _"Create Figma components based on https://mui.com"_

### Specific components

> _"Create Figma components for Button, Card, and Alert from Chakra UI (https://chakra-ui.com). Put them on a Components page."_

### Adding more components to existing file

> _"Add TextField, Select, and DatePicker from Ant Design to the Components page in my Figma file."_

### With specific theme

> _"Create Figma components for Button from Shadcn with the zinc dark theme."_

---

## New Bridge Commands Specification

### `create-page`

```typescript
// Request
{ command: "create-page", payload: { name: "📦 Components" } }

// Response
{ success: true, data: { pageId: "42:1", name: "📦 Components" } }
```

**Plugin implementation:** `figma.createPage()` + set name.

### `set-current-page`

```typescript
// Request
{ command: "set-current-page", payload: { pageId: "42:1" } }

// Response
{ success: true, data: { pageId: "42:1", name: "📦 Components" } }
```

**Plugin implementation:** `figma.setCurrentPageAsync(page)` — required so subsequent `create-node` / `create-component` calls target the correct page.

### `move-node`

```typescript
// Request
{ command: "move-node", payload: { nodeId: "50:1", targetParentId: "42:1" } }

// Response
{ success: true, data: { nodeId: "50:1", newParentId: "42:1" } }
```

**Plugin implementation:** `targetParent.appendChild(node)` — removes from old parent and inserts into new parent. Works across pages.

---

## Definition of Done

- [ ] User can prompt Copilot with a UI library URL and get Figma components
- [ ] Components are created **directly** via bridge (no local showcase app needed)
- [ ] Components live on a dedicated "📦 Components" page, **not** the default page
- [ ] At least one library (MUI) fully demonstrated end-to-end
- [ ] Bridge commands `create-page`, `set-current-page`, `move-node` implemented and tested
- [ ] Connections saved in `.figma-sync/connections.json`
- [ ] Components are reusable master components (can create instances)
- [ ] Docusaurus use case page `usecases/bootstrap-from-url.md` created
- [ ] Bridge commands doc updated with 3 new commands + MCP tools
- [ ] Sidebar updated and docs site builds cleanly

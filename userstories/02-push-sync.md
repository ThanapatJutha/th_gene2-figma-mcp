# Epic 2: Push Sync (Code → Figma)

> Review code components, compare them with linked Figma nodes, and surgically push property-level changes (text, color, size, font, corner radius) via the Plugin Bridge — always asking the user before applying.

## Context

Push sync is **MCP-first and conversational**. Instead of a CLI command, the developer asks Copilot to review a component. Copilot:

1. Reads the component source code (+ sub-components)
2. Reads the linked Figma node via the Plugin Bridge
3. Compares visual properties and presents a **change list**
4. Waits for user approval before applying anything
5. Applies changes surgically via `bridge_update_node`

### Two push mechanisms

| Mechanism | When to use | How |
|---|---|---|
| **Surgical update** (primary) | Property changes — text, color, size, font, radius | `bridge_update_node` via Plugin Bridge |
| **Full recapture** (fallback) | Structural changes — new components, layout overhaul | `generate_figma_design` via Figma MCP |

### Properties supported for surgical update

| Property | Read | Update | Notes |
|---|---|---|---|
| `characters` (text) | ✅ | ✅ | TEXT nodes only, auto-loads font |
| `width` / `height` | ✅ | ✅ | Uses `node.resize()` |
| `opacity` | ✅ | ✅ | 0–1 range |
| `fills` (color) | ✅ | ✅ | Array of Paint objects |
| `fontSize` | ✅ | ✅ | TEXT nodes, auto-loads font |
| `fontName` | ✅ | ✅ | `{ family, style }`, auto-loads font |
| `cornerRadius` | ✅ | ✅ | FRAME/RECTANGLE/COMPONENT |
| `paddingLeft/Right/Top/Bottom` | ✅ | ✅ | Auto-layout frames |
| `strokeWeight` | ✅ | ✅ | Border width |
| `strokes` | ✅ | ✅ | Array of Paint objects |

> 🔧 = needs implementation in `serializeNode` (read), `handleUpdateNode` (write), `UpdateNodePayload` (protocol), and `bridge_update_node` (MCP schema).

---

## User Stories

### 2.1 — Review & sync a component via Copilot

**As a** developer  
**I want to** say "Review HeaderCard and sync with Figma"  
**So that** Copilot compares my code with the Figma design and applies approved changes  

**Acceptance Criteria:**
- [ ] Copilot reads the component source and its linked Figma node
- [ ] Copilot presents a property-level diff table (text, color, size, font, radius, etc.)
- [ ] Each diff row shows: property name, code value, Figma value, and suggested action
- [ ] **Copilot asks for user confirmation** before applying any change
- [ ] User can cherry-pick which changes to apply (e.g. "apply 1 and 4, skip 2")
- [ ] Changes are applied surgically via `bridge_update_node`
- [ ] Copilot reports what was updated and links to the Figma file

**Tasks:**
- [x] Expose local commands as MCP tools: `bridge_read_config`, `bridge_read_connections`, `bridge_list_project_components`
- [x] Add `bridge_read_component_source` MCP tool (reads .tsx + one level of imported sub-components)
- [x] Extend `serializeNode` to read: `fontSize`, `fontName`, `cornerRadius`, `padding*`, `strokeWeight`
- [x] Extend `handleUpdateNode` to write: `fills`, `fontSize`, `fontName`, `cornerRadius`, `padding*`
- [x] Extend `UpdateNodePayload` in protocol and `bridge_update_node` Zod schema to match
- [ ] Document recommended prompt patterns

#### Example Flow — Single Component

> **User:** _"Review HeaderCard and sync with Figma"_

**Step 1 — Copilot gathers context** (automatic):

```
→ bridge_read_config          → { rootDir: ".", figmaFileKey: "ghw..." }
→ bridge_read_connections     → HeaderCard linked to Figma node "8:2"
→ bridge_read_component_source({ name: "HeaderCard" })
    → returns HeaderCard.tsx source (no sub-components)
→ bridge_read_node({ nodeId: "8:2" })
    → { name: "HeaderCard", width: 400, height: 200,
        fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.15 } }],
        children: [
          { id: "8:5", type: "TEXT", characters: "Figma Sync", fontSize: 24 },
          { id: "8:7", type: "TEXT", characters: "old subtitle" }
        ] }
```

**Step 2 — Copilot presents a diff** (waits for user):

> I reviewed **HeaderCard** (code) vs Figma node `8:2`. Here's what differs:
>
> | # | Property | Code | Figma | Suggested Action |
> |---|---|---|---|---|
> | 1 | Title text | `"Figma Sync POC"` | `"Figma Sync"` | Update text → `"Figma Sync POC"` |
> | 2 | Card background | `rgba(255,255,255,0.05)` | `rgba(26,26,38,1)` | Update fill color |
> | 3 | Card width | `100%` (fluid) | `400px` (fixed) | ⚠️ Skip — layout model difference |
> | 4 | Corner radius | `16px` | `12px` | Update → `16px` |
> | 5 | Subtitle text | `"Dashboard for code↔design sync"` | `"old subtitle"` | Update text |
>
> Which changes should I apply? (e.g. "all", "1,4,5", or "skip 3")

**Step 3 — User confirms:**

> **User:** _"Apply 1, 4, and 5. Skip the fill."_

**Step 4 — Copilot applies surgically:**

```
→ bridge_update_node({ nodeId: "8:5", properties: { characters: "Figma Sync POC" } })
→ bridge_update_node({ nodeId: "8:2", properties: { cornerRadius: 16 } })
→ bridge_update_node({ nodeId: "8:7", properties: { characters: "Dashboard for code↔design sync" } })
```

> ✅ Applied 3 changes to Figma:
> - Title text → `"Figma Sync POC"` (node 8:5)
> - Corner radius → `16px` (node 8:2)
> - Subtitle → `"Dashboard for code↔design sync"` (node 8:7)
>
> [Open in Figma ↗](https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg)

---

### 2.2 — Review component with sub-components

**As a** developer  
**I want to** review a parent component (like App) that contains sub-components  
**So that** Copilot checks all children and tells me which are linked and which need attention  

**Acceptance Criteria:**
- [ ] Copilot detects imported sub-components (one level deep)
- [ ] For each sub-component, Copilot checks if it has a Figma connection
- [ ] Unlinked sub-components are flagged — Copilot offers to auto-link by name-matching
- [ ] User can choose: review linked only, auto-link then review all, or skip
- [ ] For sub-components that exist in code but not in Figma, Copilot offers to **create instances** via `bridge_create_instance`
- [ ] After linking, Copilot runs the same property diff for each sub-component

**Tasks:**
- [x] `bridge_read_component_source` resolves one level of PascalCase imports
- [ ] Copilot chains `bridge_list_components` (Figma) + `bridge_read_connections` to detect unlinked
- [ ] On user approval, Copilot calls `bridge_save_connections` to auto-link matched components
- [x] Add `bridge_save_connections` MCP tool
- [x] Add `bridge_create_instance` MCP tool — creates component instance inside a parent frame
- [x] Add `bridge_create_node` MCP tool — creates basic frame/text when no master component exists

#### Example Flow — Parent with Sub-Components

> **User:** _"Review App and sync with Figma"_

**Step 1 — Copilot reads App.tsx:**

```
→ bridge_read_component_source({ name: "App" })
    → App.tsx imports: HeaderCard, CounterCard, ToggleSwitch
→ bridge_read_connections
    → HeaderCard → "8:2" ✅
    → CounterCard → not linked ⚠️
    → ToggleSwitch → not linked ⚠️
```

**Step 2 — Copilot reports sub-component status:**

> **App** composes 3 sub-components:
>
> | Component | Figma Link | Status |
> |---|---|---|
> | HeaderCard | `8:2` | ✅ Linked |
> | CounterCard | — | ⚠️ Not linked |
> | ToggleSwitch | — | ⚠️ Not linked |
>
> I can:
> 1. **Review HeaderCard only** (the linked one)
> 2. **Auto-link all** — I'll match CounterCard and ToggleSwitch by name in Figma, then review everything
> 3. **Skip** — just show me the component tree
>
> Which would you like?

**Step 3 — User picks option 2:**

> **User:** _"Do option 2"_

```
→ bridge_list_components
    → finds "CounterCard" (node 12:3), "ToggleSwitch" (node 15:1)
→ bridge_save_connections([
    { figmaNodeId: "12:3", codeComponent: "CounterCard", ... },
    { figmaNodeId: "15:1", codeComponent: "ToggleSwitch", ... }
  ])
```

> ✅ Auto-linked:
> - CounterCard → `12:3`
> - ToggleSwitch → `15:1`
>
> Now reviewing all 3 components…

**Step 4 — Copilot presents diffs for each** (same format as 2.1, one table per component, waits for approval per component or all at once).

---

### How Copilot Resolves a Component → Figma Node

Before Copilot can compare code vs Figma, it needs to know **which Figma node** corresponds to a code component. It uses a 3-tier resolution strategy:

```
1. Check .figma-sync/connections.json     → fastest, pre-configured via Dashboard
2. Name-match via bridge_list_components  → searches Figma for a component with the same name
3. Ask user for Figma URL or node ID      → always works, zero setup required
```

This means push sync **works even with no prior setup**. On first use, Copilot will ask the user. On subsequent uses, it reuses saved connections.

---

### Full Walkthrough — First-Time Push with Property + Structural Changes

This is the most realistic scenario from scratch: **no connections exist yet**, the developer changed visual properties (color, size, border) AND added a new child component. It shows every step of the back-and-forth conversation.

#### Starting State

**In Figma** — Card component (node `20:1`) with:
```
Card (FRAME, 360×240, fill: #1a1a26, cornerRadius: 8, stroke: 1px #333)
  ├── Button1 (INSTANCE, node 20:5, text: "Save")
  └── Button2 (INSTANCE, node 20:8, text: "Cancel")
```

**In Code** — developer made 4 changes:
```tsx
// Card.tsx — CHANGED: background, width, border-radius, and added Button3
<div style={{
  width: 480,              // was 360
  background: '#2d1b69',   // was #1a1a26
  borderRadius: 16,        // was 8
  border: '2px solid #7c3aed'  // was 1px #333
}}>
  <Button1 label="Save" />
  <Button2 label="Cancel" />
  <Button3 label="Delete" />   {/* ← NEW */}
</div>
```

**Connections:** `.figma-sync/connections.json` is **empty** (first time using push sync).

#### The Conversation

---

> **User:** _"Push sync Card component to Figma"_

---

**Step 1 — Copilot reads config and source** (automatic):

```
→ bridge_read_config
    → { rootDir: "../my-app", figmaFileKey: "abc123..." }
→ bridge_read_component_source({ name: "Card" })
    → Card.tsx source code
    → sub-components detected: Button1, Button2, Button3
→ bridge_read_connections
    → { connections: [] }   ← EMPTY, no links yet
```

---

**Step 2 — Copilot tries to resolve Card → Figma node** (3-tier):

**Tier 1 — connections.json:** Empty. No match.

**Tier 2 — name-match in Figma:**

```
→ bridge_list_components
    → [ { name: "Card", id: "20:1" },
        { name: "Button", id: "30:1" } ]
```

Found a match! But Copilot **asks before assuming**:

> I found a component named **"Card"** in your Figma file (node `20:1`).
> Is this the right one to sync with your code's `Card` component?
>
> 1. **Yes** — use node `20:1` and save the link for future syncs
> 2. **No** — let me provide a different Figma URL or node ID
> 3. **Skip** — just do a full page recapture instead

---

**Step 3 — User confirms the match:**

> **User:** _"Yes, that's the one"_

```
→ bridge_save_connections([
    { figmaNodeId: "20:1", figmaComponentName: "Card",
      codeComponent: "Card", file: "src/components/Card.tsx",
      linkedAt: "2026-03-11T..." }
  ])
```

> ✅ Linked: **Card** → Figma node `20:1` (saved for future syncs)

---

**Step 4 — Copilot reads the Figma node** (now that it knows which one):

```
→ bridge_read_node({ nodeId: "20:1" })
    → { id: "20:1", type: "FRAME", width: 360, height: 240,
        fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.15 } }],
        cornerRadius: 8, strokeWeight: 1,
        strokes: [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }],
        children: [
          { id: "20:5", type: "INSTANCE", name: "Button1" },
          { id: "20:8", type: "INSTANCE", name: "Button2" }
        ] }
```

Copilot also checks the **layer map** for any previously matched children:

```
→ bridge_read_layer_map({ parentNodeId: "20:1" })
    → { frames: {} }   ← EMPTY, first time syncing Card
```

No layer map yet, so Copilot **name-matches** children against Figma node's children:
- `Button1` in code → child named `"Button1"` (node `20:5`) in Figma ✅
- `Button2` in code → child named `"Button2"` (node `20:8`) in Figma ✅
- `Button3` in code → no matching child in Figma ⚠️

Copilot saves the matched children to the layer map for future syncs:

```
→ bridge_save_layer_map({
    parentNodeId: "20:1",
    frame: {
      codeComponent: "Card", file: "src/components/Card.tsx",
      children: {
        "Button1": { nodeId: "20:5", nodeType: "INSTANCE" },
        "Button2": { nodeId: "20:8", nodeType: "INSTANCE" }
      },
      lastSyncedAt: "2026-03-11T..."
    }
  })
```

---

**Step 5 — Copilot presents the full review** (waits for user):

> I reviewed **Card** (code) vs Figma node `20:1`. I found **4 property changes** and **1 structural change**:
>
> #### Property Changes
>
> | # | Property | Code | Figma | Suggested Action |
> |---|---|---|---|---|
> | 1 | Background color | `#2d1b69` | `#1a1a26` | Update fill |
> | 2 | Width | `480px` | `360px` | Update width → 480 |
> | 3 | Corner radius | `16px` | `8px` | Update → 16 |
> | 4 | Border | `2px solid #7c3aed` | `1px solid #333` | Update stroke weight → 2, stroke color → `#7c3aed` |
>
> #### Sub-Components
>
> | Component | Figma Match | Status |
> |---|---|---|
> | Button1 | node `20:5` (matched by name) | ✅ No changes detected |
> | Button2 | node `20:8` (matched by name) | ✅ No changes detected |
> | Button3 | — | ⚠️ **New** — exists in code but not in Figma |
>
> #### Structural Change
>
> | # | Change | Details |
> |---|---|---|
> | 5 | ➕ New child: **Button3** | Exists in code but **not in Figma node's children**. I found a **Button** master component (`30:1`) — I can create an instance. |
>
> I can apply property changes **1–4** surgically. For **#5** (new Button3), I can **create a Button instance** directly inside the Card frame using the master component (`30:1`).
>
> Which changes would you like to apply? (e.g. "all", "1–4 only", or "skip 5")

---

**Step 6 — User responds:**

> **User:** _"Apply all, including creating Button3."_

---

**Step 7 — Copilot applies property changes** (surgical):

```
→ bridge_update_node({ nodeId: "20:1", properties: {
    fills: [{ type: "SOLID", color: { r: 0.176, g: 0.106, b: 0.412 } }]
  }})
→ bridge_update_node({ nodeId: "20:1", properties: { width: 480 } })
→ bridge_update_node({ nodeId: "20:1", properties: { cornerRadius: 16 } })
→ bridge_update_node({ nodeId: "20:1", properties: {
    strokeWeight: 2,
    strokes: [{ type: "SOLID", color: { r: 0.486, g: 0.227, b: 0.918 } }]
  }})
```

> ✅ Applied 4 property changes to Card (node `20:1`):
> - Background → `#2d1b69`
> - Width → `480px`
> - Corner radius → `16px`
> - Border → `2px solid #7c3aed`

---

**Step 8 — Copilot creates Button3 instance in Figma:**

Copilot already found a "Button" master component (`30:1`) via `bridge_list_components` in Step 2. Now it creates an instance inside Card:

```
→ bridge_create_instance({
    componentId: "30:1",
    parentId: "20:1",
    name: "Button3",
    properties: { characters: "Delete" }
  })
    → { id: "20:15", name: "Button3", type: "INSTANCE", parentId: "20:1" }
```

Copilot also updates the **layer map** with the new child:

```
→ bridge_save_layer_map({
    parentNodeId: "20:1",
    frame: {
      codeComponent: "Card", file: "src/components/Card.tsx",
      children: {
        "Button1": { nodeId: "20:5", nodeType: "INSTANCE" },
        "Button2": { nodeId: "20:8", nodeType: "INSTANCE" },
        "Button3": { nodeId: "20:15", nodeType: "INSTANCE", codeComponent: "Button3" }
      },
      lastSyncedAt: "2026-03-11T..."
    }
  })
```

> ✅ Created **Button3** inside Card (`20:1`):
> - Instantiated from Button master component (`30:1`) → new node `20:15`
> - Set label text → `"Delete"`
> - Layer map updated — subsequent syncs skip name-matching
>
> [Open in Figma ↗](https://www.figma.com/design/abc123...)

> 💡 **What if no matching master component exists?** Copilot can create a basic frame via `bridge_create_node({ type: "FRAME", parentId, name, properties })`, or fall back to full page recapture (story 2.3).

---

#### What if Tier 2 (name-match) doesn't find a match?

If no Figma component named "Card" exists, Copilot falls to **Tier 3** — asks the user:

> I couldn't find a Figma component named "Card". Can you give me the Figma node to compare against?
>
> You can:
> 1. **Paste a Figma URL** — e.g. `https://www.figma.com/design/abc123/...?node-id=20-1`
> 2. **Provide a node ID** — e.g. `20:1`
> 3. **Skip comparison** — just do a full page recapture to Figma
>
> **User:** _"Here: https://www.figma.com/design/abc123/MyFile?node-id=20-1"_

Copilot extracts `node-id=20-1` → `20:1`, reads the node, and continues the flow from Step 4.

#### What if the bridge is not running?

If Copilot can't connect to the bridge at all, it falls back to the **only option that doesn't require the bridge** — full recapture via the official Figma MCP:

> The Figma bridge is not running, so I can't do surgical updates. I can still push via full page recapture.
>
> Would you like me to recapture your page to Figma?

---

#### Summary of What Happened

| Step | What | How | Who decides |
|---|---|---|---|
| 1 | Read config & source | `bridge_read_config`, `bridge_read_component_source` | Copilot (auto) |
| 2 | Resolve Card → Figma node | 3-tier: connections → name-match → ask user | Copilot proposes, **user confirms** |
| 3 | User confirms match | Copilot saves connection | **User** |
| 4 | Read Figma node tree | `bridge_read_node` + `bridge_read_layer_map` + name-match children | Copilot (auto) |
| 5 | Present diff | Property table + sub-components + structural changes | Copilot presents, **user reviews** |
| 6 | User approves | Cherry-picks changes | **User** |
| 7 | Apply property changes | `bridge_update_node` × 4 | Copilot executes |
| 8 | Create new child | `bridge_create_instance` + `bridge_save_layer_map` | Copilot executes after **user approves** |

> **Key principles:**
> - **No prior setup required** — works on first use via name-matching or user-provided URL
> - **Copilot never applies changes silently** — always asks before modifying Figma
> - **Connections** (`connections.json`) link code components ↔ Figma master components; saved automatically on first match
> - **Layer map** (`layer-map.json`) links sub-components ↔ specific Figma layers inside a parent; saved automatically during push sync
> - **Property changes = surgical**, new children = `bridge_create_instance`, full page overhaul = recapture (story 2.3)

---

### 2.3 — Push full page via recapture (fallback)

**As a** developer  
**I want to** push the entire rendered page to Figma as a new capture  
**So that** major layout overhauls or completely new pages are reflected  

> Use this when the page structure has fundamentally changed (new page, major layout overhaul, or no master component to instantiate). For individual new children, prefer `bridge_create_instance` (story 2.2).

**Acceptance Criteria:**
- [ ] Copilot recognizes when surgical update is insufficient and suggests recapture
- [ ] Uses `generate_figma_design` (official Figma MCP) with `outputMode: "existingFile"` and `fileKey` from config
- [ ] New page is added to the Figma file (not replacing existing pages)
- [ ] Copilot provides the Figma URL back to the user

**Suggested Prompts:**
- _"Push my full page to Figma"_
- _"Recapture the app to Figma"_
- _"I restructured the layout, push a fresh capture to Figma"_

**Tasks:**
- [ ] Document prompt patterns for full recapture
- [ ] Test `generate_figma_design` with `existingFile` mode using `figmaFileKey` from config
- [ ] Verify editable frames appear in Figma (not flattened images)

---

### 2.4 — Push design tokens to Figma variables

**As a** developer  
**I want** CSS custom property changes to sync back to Figma variables  
**So that** token changes in code are reflected in Figma's variable system  

**Acceptance Criteria:**
- [ ] Copilot reads CSS custom properties from `styles.css`
- [ ] Copilot reads current Figma variables via `bridge_read_variables`
- [ ] Copilot presents a diff: which tokens changed, which are new, which are deleted
- [ ] **Copilot asks for user confirmation** before updating
- [ ] Applies changes via `bridge_update_variable` / `bridge_create_variable`

**Suggested Prompt:**
- _"Sync my CSS tokens with Figma variables"_
- _"I changed --accent to #ff0000, push that to Figma"_

**Tasks:**
- [ ] Parse CSS custom properties from `styles.css` (in `bridge_read_component_source` or new tool)
- [ ] Diff CSS vars against `bridge_read_variables` output
- [ ] Map CSS names to Figma variable names (convention: `--accent` → `accent`)
- [ ] Copilot calls `bridge_update_variable` / `bridge_create_variable` per approved change

---

## Implementation Phases

### Phase 1 — Expose local commands as MCP tools
> Copilot needs to read config, connections, layer maps, and component sources without relying on file access.

**Connections** (Code Connect — component ↔ master component):
- [x] Add `bridge_read_config` MCP tool → delegates to `read-config`
- [x] Add `bridge_read_connections` MCP tool → delegates to `read-connections`
- [x] Add `bridge_list_project_components` MCP tool → delegates to `list-project-components`
- [x] Add `bridge_save_connections` MCP tool → delegates to `save-connections`

**Layer map** (sub-component ↔ specific Figma layer/instance):
- [x] Add `read-layer-map` and `save-layer-map` local commands to `server.ts` + `local-handlers.ts`
- [x] Add `bridge_read_layer_map` MCP tool → reads `.figma-sync/layer-map.json`
- [x] Add `bridge_save_layer_map` MCP tool → writes to `.figma-sync/layer-map.json`

### Phase 2 — Component source reader
> Copilot needs the actual code to understand what the component renders.

- [x] Add `bridge_read_component_source` MCP tool
- [x] Takes `{ name: string }`, resolves file from config + connections
- [x] Reads `.tsx` source, extracts PascalCase imports, reads one level of sub-components
- [x] Returns `{ component: { name, file, source }, subComponents: [...] }`

### Phase 3 — Extend node read (serializeNode)
> Copilot needs more Figma properties to compare against code.

- [x] Add `fontSize` (TEXT nodes)
- [x] Add `fontName` as `{ family, style }` (TEXT nodes)
- [x] Add `cornerRadius` (FRAME, RECTANGLE, COMPONENT)
- [x] Add `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom` (auto-layout frames)
- [x] Add `strokeWeight` and `strokes`

### Phase 4 — Extend node update + create instance
> Copilot needs to write properties beyond text/size/opacity, and create new nodes in Figma.

**Update properties:**
- [x] Wire `fills` (already in protocol, add to plugin handler + MCP schema)
- [x] Add `fontSize` update (TEXT nodes, load font first)
- [x] Add `fontName` update (TEXT nodes)
- [x] Add `cornerRadius` update
- [x] Add `paddingLeft/Right/Top/Bottom` update
- [x] Add `strokeWeight` update

**Create instance** (`create-instance` command):
- [x] Add `create-instance` command to protocol
- [x] Plugin handler: `figma.getNodeById(componentId).createInstance()` + `parent.appendChild(instance)`
- [x] Apply initial properties: `name`, `characters` (find TEXT child), `width`, `height`
- [x] Return serialized new node
- [x] Add `bridge_create_instance` MCP tool — `{ componentId, parentId, name?, properties? }`

**Create basic node** (`create-node` command — fallback when no master component):
- [x] Plugin handler: `figma.createFrame()` / `figma.createText()` + `parent.appendChild()`
- [x] Add `bridge_create_node` MCP tool — `{ type: "FRAME"|"TEXT", parentId, name?, properties? }`

### Phase 5 — Document prompt patterns
> Users need to know what to say to trigger the right flow.

- [ ] Add prompt patterns to `docs/docs/bridge/commands.md`
- [ ] Update this user story with tested, working examples

---

## Recommended Prompt Patterns

| What you want | Prompt |
|---|---|
| Review one component | _"Review HeaderCard and sync with Figma"_ |
| Review with sub-components | _"Review App component and check all its children against Figma"_ |
| Cherry-pick changes | _"Apply changes 1 and 3, skip the rest"_ |
| Push full page (fallback) | _"Push my full page to Figma"_ |
| Sync tokens | _"Sync my CSS tokens with Figma variables"_ |
| Check what's linked | _"Which components are linked to Figma?"_ |
| Auto-link by name | _"Link my code components to matching Figma components"_ |

---

## Definition of Done

- [ ] Copilot can review a component and show property-level diffs (text, color, size, font, radius)
- [ ] Copilot **always asks before applying** — user can cherry-pick changes
- [ ] Surgical updates work for: `characters`, `fills`, `width`, `height`, `opacity`, `fontSize`, `fontName`, `cornerRadius`
- [ ] Sub-component detection works — unlinked components are flagged with option to auto-link
- [ ] New children can be created in Figma via `bridge_create_instance` (from master component) or `bridge_create_node` (basic frame/text)
- [ ] Layer map (`.figma-sync/layer-map.json`) tracks sub-component ↔ Figma layer links, updated automatically during push sync
- [ ] Full-page recapture works as fallback for major layout changes via `generate_figma_design`
- [ ] Token sync works for CSS custom properties → Figma variables
- [ ] All MCP tools documented in bridge/commands.md

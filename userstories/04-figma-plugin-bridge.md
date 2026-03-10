# Epic 4: Figma Plugin Bridge (Stretch Goal)

> A Figma plugin + local WebSocket server that enables unlimited, surgical read/write access to Figma — bypassing both MCP rate limits and REST API limitations.

## Context

### Why this is needed

| Problem | Solution via Plugin |
|---|---|
| MCP read tools limited to 6/month on free plan | Plugin API has **no rate limits** |
| REST API is **read-only** for file content | Plugin API can **read + write** all node properties |
| `generate_figma_design` replaces whole pages | Plugin can update **individual nodes** surgically |
| Variables API is Enterprise-only on REST | Plugin API can read/write variables on **any plan** |

### Architecture

```
Copilot / CLI                    Figma Desktop App
     │                                │
     │  HTTP/WS commands              │
     ▼                                ▼
┌──────────────┐   WebSocket   ┌──────────────┐
│ Bridge Server│◄─────────────►│ Figma Plugin │
│ (localhost:  │               │ (UI iframe)  │
│  9001)       │               │              │
└──────────────┘               │  postMessage │
                               │      ↕       │
                               │ Main thread  │
                               │ (figma.*)    │
                               └──────────────┘
```

### Trade-off

Requires Figma desktop app to be open with the plugin running. No headless/background mode.

---

## User Stories

### 4.1 — Local WebSocket bridge server

**As a** developer  
**I want** a local WebSocket server that relays commands between CLI/Copilot and the Figma Plugin  
**So that** I have a communication channel to Figma  

**Acceptance Criteria:**
- [x] Server starts via `npm run bridge` or `figma-sync bridge`
- [x] Listens on `ws://localhost:9001`
- [x] Accepts JSON messages: `{ id, type, command, payload }`
- [x] Queues commands when plugin is not connected
- [x] Logs connection/disconnection events

**Tasks:**
- [x] Create `src/bridge/server.ts` with WebSocket server (`ws` package)
- [x] Define message protocol in `src/bridge/protocol.ts`
- [x] Add connection management (track plugin client vs CLI client)
- [x] Add command queue for offline plugin
- [x] Add `bridge` command to CLI
- [x] Add `ws` to `package.json` dependencies

---

### 4.2 — Figma plugin: connect to bridge

**As a** designer  
**I want** a Figma plugin that connects to my local bridge server  
**So that** the plugin can receive and execute commands from Copilot/CLI  

**Acceptance Criteria:**
- [x] Plugin has a UI with connection status (🟢 connected / 🔴 disconnected)
- [x] Plugin UI iframe connects to `ws://localhost:9001`
- [x] Main thread receives commands from UI via `postMessage`
- [x] Activity log shows received commands and results

**Tasks:**
- [x] Create `figma-plugin/` directory with `manifest.json`
- [x] Set up plugin UI (`ui.html`) with WebSocket connection
- [x] Set up main thread (`code.ts`) with `postMessage` handler
- [x] Declare `networkAccess` for `localhost:9001`
- [x] Show connection status and activity log in UI

---

### 4.3 — Plugin: read node properties

**As** Copilot  
**I want to** read a specific node's properties from Figma via the bridge  
**So that** I can compare Figma state against code without using rate-limited MCP tools  

**Acceptance Criteria:**
- [x] Bridge command `read-node { nodeId }` returns node type, name, text content, fills, dimensions, children
- [x] Works for text nodes, frames, rectangles, components
- [x] Returns structured JSON matching a defined schema

**Tasks:**
- [x] Implement `read-node` handler in plugin main thread
- [x] Serialize relevant node properties to JSON
- [x] Handle different node types (TEXT, FRAME, RECTANGLE, COMPONENT, etc.)
- [x] Send response back through bridge

---

### 4.4 — Plugin: read document tree

**As** Copilot  
**I want to** read the full page/document tree from Figma  
**So that** I can discover all components and their node IDs  

**Acceptance Criteria:**
- [x] Bridge command `read-tree` returns hierarchical node structure
- [x] Each node includes: id, name, type, children (recursive)
- [x] Optionally includes key properties (fills, text content) for leaf nodes

**Tasks:**
- [x] Implement `read-tree` handler with recursive traversal
- [x] Limit depth to avoid huge payloads (configurable max depth)
- [x] Return JSON tree structure

---

### 4.5 — Plugin: update node properties

**As** Copilot  
**I want to** update a specific node's properties in Figma  
**So that** code changes are reflected surgically without full-page recapture  

**Acceptance Criteria:**
- [x] Bridge command `update-node { nodeId, properties }` modifies the node
- [x] Supports updating: `characters` (text), `fills` (colors), `width`/`height`, `opacity`
- [x] Changes are visible immediately in Figma
- [x] Returns success/failure response

**Tasks:**
- [x] Implement `update-node` handler in plugin main thread
- [x] Handle text node updates (`node.characters`, requires font loading)
- [x] Handle fill updates (`node.fills`)
- [x] Handle dimension updates (`node.resize()`)
- [x] Error handling for invalid node IDs or unsupported properties

---

### 4.6 — Plugin: read/write variables

**As a** developer  
**I want** the plugin to read and write Figma variables (design tokens)  
**So that** token sync works on any plan, not just Enterprise  

**Acceptance Criteria:**
- [x] Bridge command `read-variables` returns all local variables with names, types, values
- [x] Bridge command `update-variable { name, value }` modifies an existing variable
- [x] Bridge command `create-variable { name, type, value, collection }` creates a new variable

**Tasks:**
- [x] Implement `read-variables` via `figma.variables.getLocalVariables()`
- [x] Implement `update-variable` via `variable.setValueForMode()`
- [x] Implement `create-variable` via `figma.variables.createVariable()`
- [x] Handle variable collections and modes

---

### 4.7 — Register as custom MCP server (stretch)

**As a** developer  
**I want** the bridge exposed as an MCP server  
**So that** Copilot can call bridge commands as native MCP tools  

**Acceptance Criteria:**
- [x] Bridge server implements MCP protocol (stdio or HTTP)
- [x] Registered in `.vscode/mcp.json` as `figma-bridge`
- [x] Exposes tools: `bridge_read_node`, `bridge_update_node`, `bridge_read_tree`, etc.
- [x] Copilot can call these tools directly in agent mode

**Tasks:**
- [x] Implement MCP server wrapper around bridge commands
- [x] Add to `.vscode/mcp.json`
- [x] Test from Copilot agent mode

---

## Definition of Done

- [x] Bridge server runs and accepts WebSocket connections
- [x] Figma plugin connects and shows status
- [x] Can read any node's properties via bridge
- [x] Can update text and fill properties via bridge
- [x] Can read and write variables via bridge
- [x] Activity log visible in plugin UI

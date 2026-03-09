---
sidebar_position: 3
---

# Plugin Bridge

The **Figma Plugin Bridge** enables surgical read/write access to Figma — including the ability to **convert layers into reusable components**, update individual node properties, and manage design tokens on any plan.

## Why a Plugin?

The Figma MCP server and REST API are **read-only** for design file content. They cannot create components, modify nodes, or change the file tree.

| What you need | Figma REST API | Figma MCP | Plugin API |
|---|---|---|---|
| Read nodes | ✅ | ✅ | ✅ |
| Create components | ❌ | ❌ | ✅ |
| Convert frame → component | ❌ | ❌ | ✅ |
| Update text / fills | ❌ | ❌ | ✅ |
| Read/write variables (any plan) | ❌ Enterprise only | ❌ Enterprise only | ✅ |
| Rate limits | 200/day | 200/day | **None** |

The **only** way to programmatically write to a Figma file is the **Figma Plugin API** (`figma.*`), which runs inside the Figma desktop or browser app.

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Copilot         │  stdio  │  figma-bridge    │  WS     │  Figma Plugin    │
│  (Agent Mode)    │◄──────►│  MCP Server      │◄───────►│  (inside Figma)  │
│                  │         │                  │         │                  │
│  calls MCP tools │         │  src/bridge/     │  9001   │  figma-plugin/   │
│  naturally       │         │  mcp-server.ts   │         │  code.ts + ui    │
└──────────────────┘         └────────┬─────────┘         └────────┬─────────┘
                                      │ in-process                  │
                              ┌───────▼─────────┐          ┌───────▼─────────┐
                              │  Bridge Server   │          │  figma.* API    │
                              │  server.ts       │          │  createComponent│
                              │  ws://localhost:  │          │  getNodeById    │
                              │  9001            │          │  variables.*    │
                              └──────────────────┘          └─────────────────┘
```

### Three pieces

1. **Figma Plugin** — runs inside Figma, executes `figma.*` commands, connects to bridge via WebSocket
2. **Bridge Server** — local WebSocket relay (`ws://localhost:9001`) between the plugin and MCP server
3. **Custom MCP Server** — exposes bridge commands as MCP tools that Copilot can call via stdio

## MCP Tools

The `figma-bridge` MCP server exposes 8 tools:

| Tool | Description |
|---|---|
| `bridge_ping` | Check if the Figma plugin is connected |
| `bridge_read_node` | Read any node's properties (type, name, fills, text, dimensions) |
| `bridge_read_tree` | Get the current page's node tree as JSON |
| **`bridge_create_component`** | **Convert a frame/group into a reusable Figma Component** |
| `bridge_update_node` | Update text content, fills, dimensions, or opacity |
| `bridge_read_variables` | Read all local variables (design tokens) — works on any plan |
| `bridge_create_variable` | Create a new design token |
| `bridge_update_variable` | Update an existing token value |

## Setup

### 1. Start the bridge server

```bash
npm run bridge
```

You should see:

```
[bridge] WebSocket server listening on ws://localhost:9001
```

### 2. Load the plugin in Figma

1. Open the **Figma desktop app**
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json` from this repo
4. Open the plugin — it auto-connects to `ws://localhost:9001`

You'll see a green "Connected" status in the plugin UI:

```
🔗 Figma Sync Bridge
🟢 Connected
```

### 3. Use from Copilot

The `figma-bridge` MCP server is already registered in `.vscode/mcp.json`. Once the bridge is running and the plugin is connected, just prompt Copilot:

#### Convert a frame to a component

> *"Convert Figma node 1:5 to a component named HeaderCard"*

Copilot calls `bridge_create_component` → bridge relays to plugin → plugin runs `figma.createComponent()` → frame becomes a reusable component.

#### Read node properties

> *"Read the properties of Figma node 1:17"*

#### Update text in Figma

> *"Update the text in Figma node 3:12 to say 'Hello World'"*

#### Read design tokens

> *"Read all the design variables from my Figma file"*

#### Create a design token

> *"Create a color variable called 'primary' with value #0D99FF in Figma"*

## How It Works (Detail)

### Message flow

1. **You** prompt Copilot in Agent Mode
2. **Copilot** calls a `bridge_*` MCP tool
3. **MCP Server** (`mcp-server.ts`) creates a `BridgeRequest` and sends it to the Bridge Server
4. **Bridge Server** (`server.ts`) relays the message over WebSocket to the Figma Plugin
5. **Plugin UI** (`ui.html`) receives the WebSocket message and forwards to the main thread via `postMessage`
6. **Plugin Main** (`code.ts`) executes the `figma.*` API call
7. **Response** flows back through the same chain

### Message protocol

```json
{
  "id": "uuid",
  "type": "request",
  "command": "create-component",
  "payload": {
    "nodeId": "1:5",
    "name": "HeaderCard"
  }
}
```

```json
{
  "id": "uuid",
  "type": "response",
  "success": true,
  "data": {
    "id": "2:100",
    "name": "HeaderCard",
    "type": "COMPONENT",
    "width": 320,
    "height": 200
  }
}
```

### Command queuing

If the Figma plugin is not connected when a command arrives, the bridge **queues** it. When the plugin reconnects, all queued commands are flushed automatically.

## Constraints

- The **Figma desktop or browser app must be open** with the plugin running — there is no headless mode
- The plugin UI must stay open (closing it disconnects the WebSocket)
- The plugin auto-reconnects every 3 seconds if the bridge drops

## File Reference

| File | Purpose |
|---|---|
| `src/bridge/protocol.ts` | Shared TypeScript types for messages |
| `src/bridge/server.ts` | WebSocket bridge server |
| `src/bridge/mcp-server.ts` | MCP server exposing tools to Copilot |
| `figma-plugin/manifest.json` | Figma plugin manifest |
| `figma-plugin/code.ts` | Plugin main thread — all command handlers |
| `figma-plugin/ui.html` | Plugin UI — WebSocket + status dashboard |
| `.vscode/mcp.json` | MCP server registration |

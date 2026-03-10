---
sidebar_position: 3
---

# Message Protocol

All communication through the bridge uses a simple JSON-based request/response protocol over WebSocket.

## Message Flow

```
You (natural language)
  │
  ▼
Copilot Agent Mode
  │ calls bridge_* MCP tools
  ▼
figma-bridge MCP Server (stdio)     ← src/mcp-server.ts
  │ in-process call
  ▼
Bridge WebSocket Server              ← src/server.ts
  │
  ├─── LOCAL command? ──► local-handlers.ts (filesystem)
  │
  └─── PLUGIN command? ──► ws://localhost:9001
                                │
                                ▼
                          Figma Plugin UI (iframe)     ← figma-plugin/ui.html
                                │ postMessage
                                ▼
                          Figma Plugin Main Thread     ← figma-plugin/code.ts
                                │ figma.* API calls
                                ▼
                          Figma File (live changes)
```

## Request Format

Every command is sent as a `BridgeRequest`:

```json
{
  "id": "ui-1-1709042400000",
  "type": "request",
  "command": "create-component",
  "payload": {
    "nodeId": "1:5",
    "name": "HeaderCard"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique request ID (used to match responses) |
| `type` | `"request"` | Always `"request"` for outgoing commands |
| `command` | string | One of the [bridge commands](/docs/bridge/commands) |
| `payload` | object | Command-specific data |

## Response Format

Every command returns a `BridgeResponse`:

### Success

```json
{
  "id": "ui-1-1709042400000",
  "type": "response",
  "success": true,
  "data": {
    "id": "2:100",
    "name": "HeaderCard",
    "type": "COMPONENT",
    "width": 320,
    "height": 200,
    "childCount": 3
  }
}
```

### Error

```json
{
  "id": "ui-1-1709042400000",
  "type": "response",
  "success": false,
  "error": "Node 1:5 not found"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Matches the request ID |
| `type` | `"response"` | Always `"response"` |
| `success` | boolean | Whether the command succeeded |
| `data` | any | Response payload (on success) |
| `error` | string | Error message (on failure) |

## Command Routing

The bridge server decides how to handle each command:

```
incoming request
    │
    ├── command in LOCAL_COMMANDS set?
    │       YES → handleLocalCommand() → respond directly
    │       NO  ↓
    │
    ├── plugin connected?
    │       YES → forward to plugin → wait for response → relay back
    │       NO  ↓
    │
    └── queue the command → respond with "plugin not connected" error
```

The `LOCAL_COMMANDS` set currently includes: `ping`, `read-config`, `save-config`, `list-project-components`, `list-directories`, `read-connections`, `save-connections`.

## Command Queuing

If a **plugin command** arrives when the Figma plugin is not connected, the bridge **queues** it. When the plugin reconnects, all queued commands are flushed automatically in order.

This means you can:
1. Send a command from Copilot
2. Get an immediate error: *"Figma plugin not connected. Command queued."*
3. Open the Figma plugin
4. The queued command executes automatically

## Timeouts

- **Dashboard / Settings** → 30-second timeout per request (configured in `useBridge` hook)
- **MCP Server** → 30-second timeout per request (configured in `server.ts`)
- If the plugin doesn't respond within the timeout, the request is rejected with a timeout error

## Constraints

- The **Figma desktop or browser app must be open** with the plugin running — there is no headless mode
- The plugin UI must stay open (closing it disconnects the WebSocket)
- The plugin auto-reconnects every 3 seconds if the bridge connection drops
- Only **one plugin instance** can be connected at a time

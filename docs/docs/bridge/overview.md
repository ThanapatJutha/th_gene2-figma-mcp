---
sidebar_position: 1
---

# Bridge Overview

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
│  calls MCP tools │         │  src/            │  9001   │  figma-plugin/   │
│  naturally       │         │  mcp-server.ts   │         │  code.ts + ui    │
└──────────────────┘         └────────┬─────────┘         └────────┬─────────┘
                                      │ in-process                  │
┌──────────────────┐          ┌───────▼─────────┐          ┌───────▼─────────┐
│  Dashboard /     │  WS      │  Bridge Server   │          │  figma.* API    │
│  Settings        │◄───────►│  server.ts       │          │  createComponent│
│  (Docusaurus)    │  9001    │                  │          │  getNodeById    │
└──────────────────┘          │  LOCAL commands  │          │  variables.*    │
                              │  ┌─────────────┐│          └─────────────────┘
                              │  │config, scan ││
                              │  │connections  ││
                              │  │directories  ││
                              │  └─────────────┘│
                              └──────────────────┘
```

### Four Pieces

1. **Figma Plugin** — runs inside Figma, executes `figma.*` commands, connects to bridge via WebSocket
2. **Bridge Server** — local WebSocket server (`ws://localhost:9001`) that handles two types of commands:
   - **Local commands** — config, connections, project scan — handled directly on the server
   - **Plugin commands** — forwarded to the Figma plugin over WebSocket
3. **Custom MCP Server** — exposes bridge commands as MCP tools that Copilot can call via stdio
4. **Dashboard / Settings UI** — Docusaurus pages that connect to the bridge for config management and component linking

## File Reference

| File | Purpose |
|---|---|
| `src/protocol.ts` | Shared TypeScript types for messages |
| `src/server.ts` | WebSocket bridge server — routes local vs plugin commands |
| `src/local-handlers.ts` | Local filesystem handlers (config, connections, scan) |
| `src/mcp-server.ts` | MCP server exposing tools to Copilot |
| `figma-plugin/manifest.json` | Figma plugin manifest |
| `figma-plugin/code.ts` | Plugin main thread — all command handlers |
| `figma-plugin/ui.html` | Plugin UI — WebSocket + status dashboard |
| `figma.config.json` | Project config (created via Settings page) |
| `.figma-sync/connections.json` | Component links DB (created via Dashboard) |
| `.vscode/mcp.json` | MCP server registration |

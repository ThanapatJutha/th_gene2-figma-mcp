---
sidebar_position: 1
slug: /getting-started
---

# Getting Started

**gene2-figma-mcp** is a Copilot-driven workflow for bidirectional sync between a React codebase and Figma. The code repo is the **single source of truth** for UI — all interactions happen through natural language prompts in VS Code.

## Prerequisites

- ✅ **VS Code** with **GitHub Copilot** (Agent Mode)
- ✅ **Figma desktop app** installed ([download](https://www.figma.com/downloads/))
- ✅ **Figma account** (Pro plan or higher recommended)
- ✅ **Node.js 20+** installed

## Step 1: Clone & Install

```bash
git clone https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp.git
cd gene2-figma-mcp
npm install
```

## Step 2: Configure MCP Servers

The project includes `.vscode/mcp.json` which connects Copilot to both the **official Figma MCP** (read-only tools) and the **custom bridge MCP** (read + write via plugin):

```json
{
  "servers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "figma-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "packages/gene2-figma-mcp/src/bridge/mcp-server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

| Server | Transport | Purpose |
|--------|-----------|---------|
| `figma` | HTTP | Official Figma MCP — push UI, pull design context, variables |
| `figma-bridge` | stdio | Custom bridge — read/write nodes, create components, design tokens |

When you first use a Figma MCP tool, a browser window opens for OAuth authentication.

## Step 3: Compile the Figma Plugin

The plugin is written in TypeScript and needs to be compiled before Figma can load it.

```bash
npm run plugin:build
```

This compiles `figma-docs/plugin/code.ts` → `figma-docs/plugin/code.js`.

## Step 4: Start the Bridge Server

The bridge server is a local WebSocket relay that sits between Copilot and the Figma plugin.

```bash
npm run bridge
```

You should see:

```
[bridge] WebSocket server listening on ws://localhost:9001
```

:::tip
Keep this terminal open — the bridge must be running whenever you use the plugin.
:::

The bridge handles two types of commands:
- **Local commands** — config, connections, project scan (no Figma needed)
- **Plugin commands** — forwarded to the Figma plugin running inside the desktop app

## Step 5: Load the Plugin in Figma

1. Open the **Figma desktop app**
2. Open the Figma file you want to work with
3. Go to the menu: **Plugins → Development → Import plugin from manifest…**
4. Navigate to your repo folder and select:
   ```
  figma-sync/figma-docs/plugin/manifest.json
   ```
5. The plugin **"Figma Sync Bridge"** will appear under **Plugins → Development**

### Run the plugin

1. **Plugins → Development → Figma Sync Bridge**
2. The plugin UI opens and **auto-connects** to `ws://localhost:9001`

### Verify

In the plugin UI, you should see:

```
🔗 Figma Sync Bridge
🟢 Connected
```

In the bridge server terminal:

```
[bridge] ✅ Figma plugin connected
```

:::caution
If the status shows 🔴 **Disconnected**, make sure the bridge server from Step 4 is still running. The plugin retries every 3 seconds.
:::

## Step 6: Verify Everything Works

Open **Copilot Chat** in VS Code (⌘⇧I for Agent Mode) and type:

> **"Use bridge_ping to check if the Figma plugin is connected"**

Copilot should call `bridge_ping` and return `"pong"`. If you see that, **everything is working end-to-end** ✅

## Step 7: Configure the Project

Open the [Settings](/settings) page in the documentation site and:

1. Click **Connect** to connect to the bridge
2. Enter your Figma File Key
3. Select a root directory and review include/exclude patterns
4. Click **Save Configuration** — this creates `figma/config/figma.config.json`

## Step 8: Run Your App (optional)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your project app.

## Try It Out

Now that everything is connected, try these prompts in Copilot Agent Mode:

| What you want | Prompt |
|---|---|
| Push UI to Figma | *"Capture my React app at localhost:5173 and push to Figma"* |
| Read a Figma node | *"Read the properties of Figma node 1:5 using the bridge"* |
| Convert frame → component | *"Convert Figma node 1:5 to a component named HeaderCard"* |
| Read page tree | *"Show me the node tree of the current Figma page using the bridge"* |
| Pull design context | *"Get the design context for HeaderCard from Figma node 1:5"* |
| Read design tokens | *"Read all the design variables from Figma using the bridge"* |
| Create a design token | *"Create a color variable called 'brand-primary' with value #0D99FF"* |
| Update text | *"Update the text in Figma node 3:12 to say 'Welcome to Figma Sync'"* |
| View component mappings | Open the [Dashboard](http://localhost:9001/ui/) (requires bridge) |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Copilot says "tool not found" | Restart VS Code or click "Start" on `figma-bridge` in MCP panel |
| `bridge_ping` returns error | Bridge server not running — run `npm run bridge` |
| Bridge says "plugin not connected" | Open the plugin in Figma: Plugins → Development → Figma Sync Bridge |
| Plugin shows 🔴 Disconnected | Restart `npm run bridge` — plugin auto-reconnects in 3s |
| `npx vite` picks wrong version | Use the local binary: `./node_modules/.bin/vite` |

## Setup Checklist

- [ ] `npm install` completed
- [ ] `npm run plugin:build` produces `figma-docs/plugin/code.js`
- [ ] `npm run bridge` shows `WebSocket server listening on ws://localhost:9001`
- [ ] Plugin loaded in Figma via **Import plugin from manifest**
- [ ] Plugin UI shows 🟢 **Connected**
- [ ] Bridge terminal shows `✅ Figma plugin connected`
- [ ] Copilot `bridge_ping` returns `"pong"`
- [ ] `figma/config/figma.config.json` created via Settings page

## Project Structure

```
figma-sync/
  src/                      ← Real product/app source
  figma-docs/
    bridge/
      src/
        server.ts           ← WebSocket server (local + plugin commands)
        local-handlers.ts   ← Filesystem handlers (config, connections, scan)
        mcp-server.ts       ← MCP server for Copilot integration
        protocol.ts         ← Shared message types
    plugin/                 ← Figma Plugin (runs inside Figma app)
      code.ts               ← Plugin command handlers
      ui.html               ← Plugin UI + WebSocket client
    docs/                   ← Documentation site (Docusaurus)
    dashboard/              ← Standalone dashboard UI (Vite + React)
      dist/                 ← Pre-built — served by bridge at /ui/
  figma/
    config/
      figma.config.json     ← Project config (persistent, never deleted)
    pages/
      showcase/             ← Temporary capture showcase app
    app/
      .figma-sync/
        connections.json    ← Component links (created via Dashboard)
    components/             ← React UI component files (.figma.tsx)
  .vscode/mcp.json          ← MCP server configuration
```

## Next Steps

- Link components in the [Dashboard](http://localhost:9001/ui/)
- Read the [Architecture](/docs/architecture) for the system overview
- Learn about the [Bridge](/docs/bridge/overview) for write access to Figma
- Understand the [Local Mapping](/docs/approach/local-mapping) approach for component linking

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

## Step 1: Install

Install the package from the latest [GitHub Release](https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp/releases):

```bash
npm install --save-dev https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp/releases/download/v3.0.0/gene2-figma-mcp-3.0.0.tgz
```

This adds `gene2-figma-mcp` to your project's devDependencies. It includes the CLI, bridge server, MCP server, templates, and dashboard UI.

:::tip Upgrading
To upgrade, replace the version in the URL with the new release tag:
```bash
npm install --save-dev https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp/releases/download/v0.3.0/gene2-figma-mcp-0.3.0.tgz
```
:::

<details>
<summary><strong>Alternative: Clone for development / contribution</strong></summary>

If you want to modify gene2-figma-mcp itself:

```bash
git clone https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp.git
cd th_gene2-figma-mcp
npm install
```

</details>

## Step 2: Initialize Your Project

```bash
npx gene2-figma-mcp init
```

This creates the following files in your project:

| File | Purpose |
|------|---------|
| `figma/config/figma.config.json` | Project config — set your Figma file key here |
| `.vscode/mcp.json` | MCP server wiring for Copilot |
| `.github/copilot-instructions.md` | Copilot behavioral rules for Figma workflows |
| `figma/app/.figma-sync/connections.json` | Code ↔ Figma component mappings |
| `figma/components/` | Directory for `.figma.tsx` component specs |

:::info Already initialized?
Use `npx gene2-figma-mcp init --force` to re-generate files (overwrites existing).
:::

## Step 3: Configure MCP Servers

The `init` command creates `.vscode/mcp.json` which connects Copilot to both MCP servers:

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
      "args": ["gene2-figma-mcp", "mcp"],
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

## Step 4: Start the Bridge Server

The bridge server is a local WebSocket relay that sits between Copilot and the Figma plugin. It also serves the dashboard UI.

```bash
npx gene2-figma-mcp bridge
```

You should see:

```
[bridge] WebSocket server listening on ws://localhost:9001
[bridge] Dashboard UI available at http://localhost:9001/ui/
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
4. Navigate to the plugin folder and select the manifest:
   ```
   node_modules/gene2-figma-mcp/figma-plugin/manifest.json
   ```
5. The plugin **"Figma Sync Bridge"** will appear under **Plugins → Development**

:::note Plugin location
If you cloned the repo for development, the manifest is at `figma-docs/plugin/manifest.json` instead.
:::

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

![Plugin connected to the bridge](/img/plugin-connected.png)

:::caution
If the status shows 🔴 **Disconnected**, make sure the bridge server from Step 4 is still running. The plugin retries every 3 seconds.
:::

## Step 6: Verify Everything Works

Open **Copilot Chat** in VS Code (⌘⇧I for Agent Mode) and type:

> **"Use bridge_ping to check if the Figma plugin is connected"**

Copilot should call `bridge_ping` and return `"pong"`. If you see that, **everything is working end-to-end** ✅

## Step 7: Configure the Project

Open the dashboard at **http://localhost:9001/ui/#settings** and:

1. The dashboard auto-connects to the bridge
2. Enter your **Figma File Key** (from the URL: `figma.com/design/FILE_KEY/...`)
3. Select a root directory and review include/exclude patterns
4. Click **Save Configuration** — this saves to `figma/config/figma.config.json`

:::tip
You can also run `npx gene2-figma-mcp doctor` to diagnose any setup issues.
:::

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
| `bridge_ping` returns error | Bridge server not running — run `npx gene2-figma-mcp bridge` |
| Bridge says "plugin not connected" | Open the plugin in Figma: Plugins → Development → Figma Sync Bridge |
| Plugin shows 🔴 Disconnected | Restart `npx gene2-figma-mcp bridge` — plugin auto-reconnects in 3s |
| Setup issues | Run `npx gene2-figma-mcp doctor` for diagnostics |

## Setup Checklist

- [ ] `npm install` completed (with tarball URL or via clone)
- [ ] `npx gene2-figma-mcp init` ran (if using tarball install)
- [ ] `npx gene2-figma-mcp bridge` shows `WebSocket server listening on ws://localhost:9001`
- [ ] Dashboard loads at `http://localhost:9001/ui/`
- [ ] Plugin loaded in Figma via **Import plugin from manifest**
- [ ] Plugin UI shows 🟢 **Connected**
- [ ] Bridge terminal shows `✅ Figma plugin connected`
- [ ] Copilot `bridge_ping` returns `"pong"`
- [ ] `figma/config/figma.config.json` configured with Figma file key

## Project Structure (Consumer)

After running `npx gene2-figma-mcp init`, your project will have:

```
your-project/
  .github/
    copilot-instructions.md   ← Copilot behavioral rules (auto-read)
  .vscode/
    mcp.json                  ← MCP server config for Copilot
  figma/
    config/
      figma.config.json       ← Project config (file key, patterns)
    components/               ← .figma.tsx component specs
    app/
      .figma-sync/
        connections.json      ← Code ↔ Figma component mappings
  src/                        ← Your app source code
  node_modules/
    gene2-figma-mcp/          ← CLI, bridge, MCP server, dashboard, plugin
```

## CLI Commands

```bash
npx gene2-figma-mcp init          # Seed project files
npx gene2-figma-mcp init --force  # Re-seed (overwrite existing)
npx gene2-figma-mcp bridge        # Start WebSocket bridge + dashboard
npx gene2-figma-mcp mcp           # Start MCP server (used by VS Code)
npx gene2-figma-mcp doctor        # Diagnose setup issues
npx gene2-figma-mcp --version     # Print version
```
    components/             ← React UI component files (.figma.tsx)
  .vscode/mcp.json          ← MCP server configuration
```

## Next Steps

- Link components in the [Dashboard](http://localhost:9001/ui/)
- Read the [Architecture](/docs/architecture) for the system overview
- Learn about the [Bridge](/docs/bridge/overview) for write access to Figma
- Understand the [Local Mapping](/docs/approach/local-mapping) approach for component linking

---
sidebar_position: 1
slug: /getting-started
---

# Getting Started

**figma-sync** is a Copilot-driven workflow for bidirectional sync between a React codebase and Figma. The code repo is the **single source of truth** for UI — all interactions happen through natural language prompts in VS Code.

## Prerequisites

- **VS Code** with **GitHub Copilot** (Agent Mode)
- **Figma account** (Pro plan or higher recommended)
- **Node.js** 20+ (for the sample React app)

## Quick Setup

### 1. Clone the repo

```bash
git clone https://github.com/patja60/figma-sync.git
cd figma-sync
npm install
```

### 2. Configure the Figma MCP server

The project includes `.vscode/mcp.json` which connects Copilot to Figma:

```json
{
  "servers": {
    "Figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

When you first use a Figma MCP tool, a browser window opens for OAuth authentication.

### 3. Run the sample React app

```bash
cd demo
npm install
./node_modules/.bin/vite --port 5173
```

Open [http://localhost:5173](http://localhost:5173) to see the POC app.

### 4. Start the bridge server

```bash
npm run bridge
```

You should see: `[bridge] WebSocket server listening on ws://localhost:9001`

The bridge handles two types of commands:
- **Local commands** — config, connections, project scan (no Figma needed)
- **Plugin commands** — forwarded to the Figma plugin running inside the desktop app

### 5. Configure the project

Open the [Settings](/settings) page in the documentation site and:

1. Click **Connect** to connect to the bridge
2. Enter your Figma File Key
3. Select a root directory and review include/exclude patterns
4. Click **Save Configuration** — this creates `figma.config.json`

### 6. Try your first sync

Open Copilot Agent Mode in VS Code and try:

> **"Capture my running React app at localhost:5173 and push it to Figma"**

Copilot will call `generate_figma_design` to capture the rendered page and create editable frames in a new Figma file.

## How It Works

Instead of running commands, you interact with Copilot using natural language. Copilot uses the **Figma MCP server** to call Figma tools on your behalf.

### Example Prompts

| What you want | Prompt to Copilot |
|---|---|
| Push UI to Figma | *"Capture my React app at localhost:5173 and push to the existing Figma file"* |
| Pull design changes | *"Get the design context for HeaderCard from Figma node 1:5 in file ghwHnqX2WZXFtfmsrbRLTg"* |
| Explore Figma file tree | *"Get the metadata for my Figma file ghwHnqX2WZXFtfmsrbRLTg"* |
| Get design tokens | *"Get the variable definitions from Figma file ghwHnqX2WZXFtfmsrbRLTg"* |
| View component mappings | Browse the [Dashboard](/dashboard) page |

## Project Structure

```
figma-sync/
  demo/                     ← Sample React app (Vite + React 18)
    src/components/         ← HeaderCard, CounterCard, ToggleSwitch
  src/                      ← Bridge server & MCP tools
    server.ts               ← WebSocket server (local + plugin commands)
    local-handlers.ts       ← Filesystem handlers (config, connections, scan)
    mcp-server.ts           ← MCP server for Copilot integration
    protocol.ts             ← Shared message types
  figma-plugin/             ← Figma Plugin (runs inside Figma)
    code.ts                 ← Plugin command handlers
    ui.html                 ← Plugin UI + WebSocket client
  docs/                     ← Documentation site (Docusaurus)
    src/pages/dashboard.tsx ← Dashboard — Discover + Components
    src/pages/settings.tsx  ← Settings — project configuration
  figma.config.json         ← Project config (created via Settings)
  .figma-sync/              ← Local DB (gitignored)
    connections.json        ← Component links (created via Dashboard)
  .vscode/mcp.json          ← MCP server configuration
```

## Next Steps

- Configure the project via [Settings](/settings)
- Link components in the [Dashboard](/dashboard)
- Read the [Architecture](/docs/architecture) for the system overview
- Learn about the [Bridge](/docs/bridge/overview) for write access to Figma
- Understand the [Local Mapping](/docs/approach/local-mapping) approach for component linking

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
cd poc-react
npm install
./node_modules/.bin/vite --port 5173
```

Open [http://localhost:5173](http://localhost:5173) to see the POC app.

### 4. Try your first sync

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
  poc-react/            ← Sample React app (Vite + React 18)
    src/
      components/       ← HeaderCard, CounterCard, ToggleSwitch
  docs/                 ← This documentation site (Docusaurus)
  figma-sync.map.json   ← Component ↔ Figma node mappings
  userstories/          ← Epic & user story tracking
  .vscode/mcp.json      ← MCP server configuration
```

## Next Steps

- View the [Dashboard](/dashboard) to see current mappings
- Read the [MCP Approach](/docs/approach/mcp-overview) to understand the sync strategy
- Check the [Architecture](/docs/architecture) for the system overview

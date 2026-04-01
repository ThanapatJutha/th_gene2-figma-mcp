# gene2-figma-mcp

Copilot-driven bidirectional sync between a React codebase and Figma.  
**Code is the single source of truth for UI — even for designers.**

## Quick Start

### 1. Install

```bash
# Install from the latest GitHub release
npm install --save-dev https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp/releases/download/v3.0.0/gene2-figma-mcp-3.0.0.tgz
```

> Check the [Releases page](https://github.com/GLOBAL-PALO-IT/th_gene2-figma-mcp/releases) for the latest version URL.

### 2. Initialize your project

```bash
npx gene2-figma-mcp init
```

This seeds the required files into your project:

| File | Purpose |
|------|---------|
| `figma/config/figma.config.json` | Project config — set your Figma file key here |
| `.vscode/mcp.json` | MCP server wiring for Copilot |
| `.github/copilot-instructions.md` | Copilot behavioral rules for Figma workflows |
| `figma/app/.figma-sync/connections.json` | Code ↔ Figma component mappings |
| `figma/components/` | Directory for `.figma.tsx` component specs |

### 3. Start the bridge server

```bash
npx gene2-figma-mcp bridge
```

The bridge runs on `ws://localhost:9001` and relays commands between Copilot (via MCP) and the Figma Plugin.

The built-in dashboard UI is available at **http://localhost:9001/ui/** — use it to discover layers, convert them to components, manage code mappings, and configure settings.

### 4. Open VS Code in Agent Mode

With the bridge running and the [Gene2 Figma MCP plugin](https://www.figma.com/community) installed in Figma Desktop, use Copilot to:

| Action | Prompt |
|--------|--------|
| Push UI to Figma | *"Capture my React app at localhost:5173 and push to Figma"* |
| Pull design context | *"Get the design context for this Figma URL"* |
| Discover components | *"Discover components in my Figma file and create mappings"* |

## CLI Commands

```
npx gene2-figma-mcp init          # Seed project files
npx gene2-figma-mcp init --force  # Re-seed (overwrite existing)
npx gene2-figma-mcp bridge        # Start WebSocket bridge server
npx gene2-figma-mcp mcp           # Start MCP server (used by VS Code)
npx gene2-figma-mcp doctor        # Diagnose setup issues
npx gene2-figma-mcp --version     # Print version
```

## How It Works

Everything runs through **GitHub Copilot Agent Mode** in VS Code, powered by two MCP servers:

| Server | Transport | Purpose |
|--------|-----------|---------|
| `figma` | HTTP | Official Figma MCP — capture, design context |
| `figma-bridge` | stdio | Custom bridge — node CRUD, components, specs, tokens |

**Data flow:** Copilot → MCP → Bridge (port 9001) → Figma Plugin

## Documentation

Full documentation is available at:  
**[https://GLOBAL-PALO-IT.github.io/th_gene2-figma-mcp/](https://GLOBAL-PALO-IT.github.io/th_gene2-figma-mcp/)**

Covers architecture, setup, usecases, bridge protocol, and troubleshooting.

## Project Structure

```
your-project/
├── .github/copilot-instructions.md   ← Copilot rules (seeded by init)
├── .vscode/mcp.json                  ← MCP server config (seeded by init)
├── figma/
│   ├── config/figma.config.json      ← Project config
│   ├── app/.figma-sync/              ← Connections & layer map
│   └── components/                   ← .figma.tsx component specs
└── src/                              ← Your app source code
```

## Requirements

- Node.js ≥ 20
- VS Code with GitHub Copilot (Agent Mode)
- Figma Desktop with Gene2 Figma MCP plugin

## License

MIT

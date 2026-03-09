# figma-sync

Copilot-driven bidirectional sync between a React codebase and Figma.  
**Code is the single source of truth for UI — even for designers.**

## How It Works

There is **no CLI**. Everything runs through **GitHub Copilot Agent Mode** in VS Code, powered by the **Figma MCP server**.

| Action | Copilot Prompt |
|---|---|
| Push UI to Figma | *"Capture my React app at localhost:5173 and push to Figma"* |
| Pull design context | *"Get the design context for node 1:5 in Figma file ghwHnqX2WZXFtfmsrbRLTg"* |
| Explore Figma file | *"Get metadata for Figma file ghwHnqX2WZXFtfmsrbRLTg"* |
| Get design tokens | *"Get variable definitions from Figma file ghwHnqX2WZXFtfmsrbRLTg"* |

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/patja60/figma-sync.git
cd figma-sync
npm install
```

### 2. Figma MCP server

The repo ships with `.vscode/mcp.json` which connects Copilot to Figma:

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

When you first use a Figma tool, a browser window opens for OAuth.

### 3. Run the React POC

```bash
cd poc-react
npm install
./node_modules/.bin/vite --port 5173
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Try it

Open Copilot Agent Mode (⌘⇧I) and type:

> "Capture my running React app at localhost:5173 and push it to Figma"

## Project Structure

```
figma-sync/
  poc-react/              ← Sample React app (Vite + React 18)
    src/components/       ← HeaderCard, CounterCard, ToggleSwitch
  docs/                   ← Documentation site (Docusaurus)
  src/                    ← Shared types & mapping utilities
    types.ts              ← FigmaSyncMap, ComponentMapping types
    map.ts                ← Read/write figma-sync.map.json
    nodes.ts              ← Figma node tree helpers
  figma-sync.map.json     ← Component ↔ Figma node mappings
  userstories/            ← Epic & user story tracking
  .vscode/mcp.json        ← MCP server configuration
```

## Component Mappings

Mappings live in `figma-sync.map.json`. Current mappings:

| Component | File | Figma Node |
|---|---|---|
| HeaderCard | `poc-react/src/components/HeaderCard.tsx` | `1:5` |
| CounterCard | `poc-react/src/components/CounterCard.tsx` | `1:17` |
| ToggleSwitch | `poc-react/src/components/ToggleSwitch.tsx` | `1:42` |

To add a mapping, edit the file directly or prompt Copilot:

> "Add a mapping for MyComponent at poc-react/src/components/MyComponent.tsx with Figma node 1:99"

## Documentation Site

```bash
npm run docs:dev     # Dev server on http://localhost:4000/figma-sync/
npm run docs:build   # Production build
npm run docs:serve   # Serve the build locally
```

## License

MIT

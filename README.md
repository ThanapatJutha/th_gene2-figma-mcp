# figma-sync

Copilot-driven bidirectional sync between a React codebase and Figma.  
**Code is the single source of truth for UI — even for designers.**

## How It Works

There is **no CLI**. Everything runs through **GitHub Copilot Agent Mode** in VS Code, powered by the **Figma MCP server** and a custom **Bridge Server**.

| Action | How |
|---|---|
| Push UI to Figma | Prompt Copilot: *"Capture my React app at localhost:5173 and push to Figma"* |
| Pull design context | Prompt Copilot: *"Get the design context for node 1:5 in Figma file ghwHnqX2WZXFtfmsrbRLTg"* |
| Configure project | Open **Settings** page → set file key, include patterns → Save |
| Link components | Open **Dashboard** → Components tab → link code ↔ Figma components |
| Discover layers | Open **Dashboard** → Discover tab → scan Figma file tree |

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

### 3. Run the demo app

```bash
cd demo
npm install
./node_modules/.bin/vite --port 5173
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Start the bridge server

```bash
npm run bridge
```

The bridge handles **local commands** (config, connections, file scanning) and **plugin commands** (forwarded to the Figma Plugin running inside the desktop app).

### 5. Configure the project

Open the documentation site and go to the **Settings** page:

```bash
npm run docs:dev     # Dev server on http://localhost:4000/figma-sync/
```

Navigate to **Settings**, connect to the bridge, and save your project config. This creates `figma.config.json`.

### 6. Link components

Go to the **Dashboard** → **Components** section to link code components with Figma components. Links persist in `.figma-sync/connections.json`.

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
  figma-plugin/             ← Figma Plugin (runs inside Figma app)
    code.ts                 ← Plugin command handlers
    ui.html                 ← Plugin UI + WebSocket client
  docs/                     ← Documentation site (Docusaurus)
    src/pages/dashboard.tsx ← Dashboard — Discover + Components
    src/pages/settings.tsx  ← Settings — project configuration
  figma.config.json         ← Project config (created via Settings page)
  .figma-sync/              ← Local DB — gitignored
    connections.json        ← Component links (created via Dashboard)
  .vscode/mcp.json          ← MCP server configuration
```

## Documentation Site

```bash
npm run docs:dev     # Dev server on http://localhost:4000/figma-sync/
npm run docs:build   # Production build
npm run docs:serve   # Serve the build locally
```

Pages:
- **Dashboard** — Discover Figma layers, link code ↔ Figma components
- **Settings** — Configure project file key, include/exclude patterns, parser

## License

MIT

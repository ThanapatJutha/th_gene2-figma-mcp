# figma-sync

Small CLI helpers to sync Figma file metadata and export URLs to disk.

## Figma MCP (VS Code)

This repo includes a workspace MCP configuration at .vscode/mcp.json with two servers:

- figma: Remote Figma MCP server (recommended)
- figma-desktop: Desktop MCP server (runs from the Figma desktop app)

### Remote server (recommended)

1. In VS Code, open the Command Palette (⌘⇧P)
2. Run: MCP: Open Workspace Folder MCP Configuration
3. Ensure there is a server named figma pointing at https://mcp.figma.com/mcp
4. Click Start above the server name, then complete the Allow Access OAuth flow

### Desktop server (Figma desktop app)

1. Open the Figma desktop app
2. Open any Figma Design file, switch to Dev Mode, and enable the Desktop MCP server
3. Confirm it’s running at http://127.0.0.1:3845/mcp
4. In VS Code MCP configuration, click Start for figma-desktop

Tip: In Copilot Chat (Agent mode), type #get_design_context to verify tools are available.

Note: MCP authentication is handled via an OAuth browser flow (remote) or the desktop app (local). It’s separate from the `FIGMA_TOKEN` used by the CLI commands below.

## Prereqs

- Node.js 18+ (uses built-in `fetch`)

## Setup

```bash
cd figma-sync
npm install
cp .env.example .env
```

Fill in:

- `FIGMA_TOKEN` (Figma Personal Access Token)
- `FIGMA_FILE_KEY` (from the Figma file URL)

## Usage

Fetch file JSON:

```bash
npm run dev -- file --out out/figma-file.json
# or
npm run build && npm start -- file --out out/figma-file.json
```

Get export image URLs:

```bash
npm run dev -- images --ids "1:2,3:4" --format png --out out/figma-images.json
```

Notes:

- This tool currently writes Figma API responses to JSON files. If you tell me what you want to sync (variables, components, icons, etc.), I can extend the commands accordingly.

## React POC

Folder: poc-react

Run:

- cd poc-react
- npm install
- npm run dev

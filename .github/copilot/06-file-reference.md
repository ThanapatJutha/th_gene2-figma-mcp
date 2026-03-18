# File Reference

> **Note:** Project structure is summarized in `.github/copilot-instructions.md` section 2.
> This file provides the complete map.

- `.github/copilot-instructions.md` — entry point (auto-read by Copilot)
- `figma/components/*.figma.tsx` — React UI component files (visual shell, no business logic)
- `figma/app/.figma-sync/connections.json` — code↔Figma mappings
- `figma/config/figma.config.json` — project config (persistent, never deleted)
- `figma-docs/bridge/src/mcp-server.ts` — bridge MCP tool definitions
- `figma-docs/bridge/src/server.ts` — bridge websocket server
- `figma-docs/plugin/code.ts` — plugin command handlers
- `.vscode/mcp.json` — MCP server wiring
- `src/` — runtime/product app code
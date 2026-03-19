# File Reference

> **Note:** Project structure is summarized in `.github/copilot-instructions.md` section 2.
> This file provides the complete map.

## Core files
- `.github/copilot-instructions.md` — entry point (auto-read by Copilot)
- `figma/components/*.figma.tsx` — React UI component files (visual shell, no business logic)
- `figma/app/.figma-sync/connections.json` — code↔Figma mappings
- `figma/config/figma.config.json` — project config (persistent, never deleted)
- `packages/gene2-figma-mcp/src/bridge/mcp-server.ts` — bridge MCP tool definitions
- `packages/gene2-figma-mcp/src/bridge/server.ts` — bridge websocket server
- `figma-docs/plugin/code.ts` — plugin command handlers
- `.vscode/mcp.json` — MCP server wiring
- `src/` — runtime/product app code

## Copilot rules & usecases
- `.github/copilot/rules/01-read-and-update-nodes.md` — node manipulation patterns
- `.github/copilot/rules/02-design-tokens.md` — token naming, minimum set, creation workflow
- `.github/copilot/rules/03-component-spec-layer.md` — React UI component file rules
- `.github/copilot/rules/04-layout-constants.md` — layout constants, grid formulas, batch-by-size pattern
- `.github/copilot/rules/05-variant-inference.md` — known variant structures per library
- `.github/copilot/rules/06-template-discovery.md` — template naming, discovery, fallback behavior
- `.github/copilot/usecases/01-create-ds-component-page.md` — Create DS Component Page workflow
- `.github/copilot/usecases/02-discover-and-convert.md` — Discover & Convert workflow
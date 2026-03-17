# Overview and Global Rules

## Project overview

`figma-sync` bridges VS Code and Figma with two servers:
- `figma` (official MCP)
- `figma-bridge` (local bridge)

High-level path: Copilot → MCP → Bridge (port 9001) → Figma Plugin.

## Prerequisites

- Bridge running (`npm run bridge`)
- Figma plugin connected
- Agent mode enabled
- Valid Figma file key

## Global completion invariant

Figma-library tasks are complete only when both exist:
- `figma/components/*.figma.ts`
- `figma/app/.figma-sync` (especially `connections.json`)

Changes only in `figma/pages/showcase/` are partial progress.

## Global source-of-truth order

1. `connections.json`
2. `figma/components/*.figma.ts`
3. Live node data from bridge read calls

Always read spec files first when they exist.

## Project structure rule

- Runtime/product code: `src/`
- Figma sync artifacts: `figma/`
- Bridge implementation: `.figma.config/bridge/src/`
- Plugin implementation: `.figma.config/plugin/`

Never put runtime components in `figma/components/`.

## Library detection rule

Before generating showcase UI:
1. Read target `package.json`
2. Detect installed UI library
3. Use detected library exactly
4. If unclear, ask user before generating

## Standard style/sync flow

1. Check existing specs
2. Read spec if exists
3. If missing: read mappings + node, then create/save spec
4. For sync: diff spec vs node, then apply minimal updates
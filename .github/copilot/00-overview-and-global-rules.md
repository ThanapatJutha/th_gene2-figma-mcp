# Overview and Global Rules

> **Note:** This is a deep-reference file. The primary instructions are in
> `.github/copilot-instructions.md` (auto-read). This file adds detail.

## Project overview

`figma-sync` bridges VS Code and Figma with two servers:
- `figma` (official MCP)
- `figma-bridge` (local bridge)

High-level path: Copilot → MCP → Bridge (port 9001) → Figma Plugin.

## Prerequisites

- Bridge running (`npm run bridge`)
- Figma plugin connected
- Agent mode enabled
- Valid Figma file key (in `figma/config/figma.config.json`)

## Global completion invariant

Figma-library tasks are complete only when ALL exist:
- Components promoted in Figma (via `bridge_create_component`)
- `.figma.tsx` React component files in `figma/components/`
- Mappings saved in `figma/app/.figma-sync/connections.json`

Changes only in `figma/pages/showcase/` are partial progress.

## Global source-of-truth order

1. `figma/config/figma.config.json` (project config, file key)
2. `connections.json` (mapping state)
3. `figma/components/*.figma.tsx` (React UI components)
4. Live node data from bridge read calls

## Project structure rule

- Runtime/product code (business logic): `src/`
- Figma React UI components (visual shell only): `figma/components/*.figma.tsx`
- Bridge implementation: `figma-docs/bridge/src/`
- Plugin implementation: `figma-docs/plugin/`

`.figma.tsx` files are **real, renderable React components** that wrap the
project's UI library. They contain only visual/style code — never business logic.

## Library detection rule

Before generating showcase UI:
1. Read target `package.json`
2. Detect installed UI library
3. Use detected library exactly
4. If unclear, ask user before generating

## Figma file key rule

1. Check `figma/config/figma.config.json` → look for `figmaFileKey`
2. If user provided a file key or URL, use that instead
3. Never guess or fabricate a file key

## Standard style/sync flow

1. Check existing `.figma.tsx` files
2. Read component file if exists
3. If missing: read mappings + node, then create/save React component
4. For sync: diff component vs node, then apply minimal updates
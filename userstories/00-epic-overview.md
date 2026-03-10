# Figma Sync POC — Overview

## Vision

Make the **code repo the single source of truth** for UI. Designers and developers collaborate through Figma, but all changes flow through code. Copilot is the bridge.

## Key findings (2026-03-09)

| Capability | Tool | Rate Limit (Free/Starter) | Status |
|---|---|---|---|
| **Push** rendered UI → Figma | `generate_figma_design` | ✅ **Exempt (unlimited)** | Available now |
| **Push** component mapping | `add_code_connect_map` | ✅ **Exempt (unlimited)** | Available now |
| **Pull** design context | `get_design_context` | ⚠️ 6/month | Available now |
| **Pull** variables/tokens | `get_variable_defs` | ⚠️ 6/month | Available now |
| **Pull** metadata (XML tree) | `get_metadata` | ⚠️ 6/month | Available now |
| **Pull** screenshot | `get_screenshot` | ⚠️ 6/month | Available now |
| Read component mappings | `get_code_connect_map` | ⚠️ 6/month | Available now |
| Auto-suggest mappings | `get_code_connect_suggestions` | ⚠️ 6/month | Available now |
| Modify node properties | Figma Plugin API only | No rate limit | ✅ Done |
| Modify node via REST API | ❌ Not possible | — | Does not exist |

> **Source**: [GitHub Blog — Figma MCP can now generate design layers from VS Code](https://github.blog/changelog/2026-03-06-figma-mcp-server-can-now-generate-design-layers-from-vs-code/)

## Current Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CODE REPO (source of truth)                      │
│                                                                          │
│  React components ─── figma.config.json ─── .figma-sync/connections.json │
└──────────┬──────────────────────┬─────────────────────────┬──────────────┘
           │                      │                          │
     PUSH (write)          CONFIG / LINK            PULL (read)
           │                      │                          │
           ▼                      ▼                          ▼
┌─────────────────┐  ┌────────────────────────┐  ┌─────────────────────────┐
│ generate_figma_ │  │    Bridge Server        │  │ get_design_context      │
│ design          │  │    ws://localhost:9001   │  │ get_variable_defs       │
│ (Figma MCP)     │  │                         │  │ get_metadata            │
│                 │  │  LOCAL        PLUGIN     │  │ (Figma MCP)             │
│                 │  │  commands     commands   │  │                         │
└────────┬────────┘  └────────────┬────────────┘  └────────────┬────────────┘
         │                        │                             │
         ▼                        ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            FIGMA FILE                                    │
│         Editable frames · Components · Variables (tokens)                │
└──────────────────────────────────────────────────────────────────────────┘
```

## What's Been Built

| Area | What | Status |
|---|---|---|
| **Plugin Bridge** | WebSocket server + Figma Plugin + MCP tools | ✅ Done |
| **Component Mapping** | Config (`figma.config.json`) + connections DB (`.figma-sync/`) | ✅ Done |
| **Dashboard** | Discover layers + link code ↔ Figma components | ✅ Done |
| **Settings** | Project config editor (file key, globs, parser) | ✅ Done |
| **Push Sync** | `generate_figma_design` captures rendered UI | ✅ Available |
| **Pull Sync** | `get_design_context` retrieves design + code | ✅ Available |
| **Documentation** | Docusaurus site with architecture & approach docs | ✅ Done |

## Out of scope for POC

- Multi-page app sync (one page is enough)
- Real-time / live sync (manual trigger is fine)
- CI/CD integration
- Multi-user conflict resolution

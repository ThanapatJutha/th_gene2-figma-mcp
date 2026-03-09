---
sidebar_position: 2
---

# Architecture

## Vision

Make the **code repo the single source of truth** for UI. Designers and developers collaborate through Figma, but all changes flow through code. Copilot is the bridge.

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   CODE REPO (source of truth)        │
│                                                      │
│  React components + CSS tokens + Copilot (MCP)       │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
     PUSH (write)               PULL (read)
           │                          │
           ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ generate_figma_  │    │ get_design_context            │
│ design           │    │ get_variable_defs             │
│ (UNLIMITED)      │    │ get_metadata                  │
│                  │    ├──────────────────────────────┤
│ Local mapping    │    │ Plugin Bridge (MCP)           │
│ file + Copilot   │    │ create_component · read/write │
└────────┬─────────┘    └──────────────┬───────────────┘
         │                             │
         ▼                             ▼
┌──────────────────────────────────────────────────────┐
│                     FIGMA FILE                        │
│  Editable frames · Component mappings · Tokens        │
└──────────────────────────────────────────────────────┘
```

## Data Flow

### Push (Code → Figma)

1. Developer changes a React component
2. Dev server hot-reloads the UI
3. `generate_figma_design` captures the rendered page
4. Figma file receives **editable frames** (not flattened images)

### Pull (Figma → Code)

1. Designer changes colours, text, or layout in Figma
2. `get_design_context` retrieves the updated design + generated code
3. Copilot diffs the Figma state against current code
4. Developer reviews and accepts changes

## Epics

| # | Epic | Status | Priority |
|---|---|---|---|
| 1 | Component Mapping | ✅ Done (local) | 🔴 High |
| 2 | Push Sync (Code → Figma) | 🔲 Planned | 🔴 High |
| 3 | Pull Sync (Figma → Code) | 🔲 Planned | 🔴 High |
| 4 | Figma Plugin Bridge | ✅ Done | 🟡 Medium |
| 5 | End-to-End Demo | 🔲 Planned | 🔴 High |
| 6 | Documentation & UI | 🔄 In Progress | 🟢 Low |

## MCP Tool Capabilities

| Tool | Direction | Rate Limit (Pro) | Plan Required |
|---|---|---|---|
| `generate_figma_design` | Push | ✅ Unlimited | Any |
| `get_design_context` | Pull | 200/day | Any |
| `get_variable_defs` | Pull | 200/day | Any |
| `get_metadata` | Pull | 200/day | Any |
| `add_code_connect_map` | Push | ✅ Unlimited | ⛔ Org/Enterprise |
| `get_code_connect_suggestions` | Pull | 200/day | ⛔ Org/Enterprise |

> **Key finding:** Code Connect requires Org/Enterprise plan. We use a local mapping file (`figma-sync.map.json`) instead.

## Implementation Order

```
Epic 1 (Mapping) ✅ → Epic 2 (Push) → Epic 3 (Pull) → Epic 5 (Demo)
                                                      ↗
                      Epic 4 (Plugin Bridge) ✅ ──────┘
```

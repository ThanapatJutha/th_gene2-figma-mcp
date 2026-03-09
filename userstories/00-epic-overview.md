# Figma Sync POC — Epic Overview

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
| Modify node properties | Figma Plugin API only | No rate limit | Needs building |
| Modify node via REST API | ❌ Not possible | — | Does not exist |

> **Source**: [GitHub Blog — Figma MCP can now generate design layers from VS Code](https://github.blog/changelog/2026-03-06-figma-mcp-server-can-now-generate-design-layers-from-vs-code/)

## Revised architecture

```
┌─────────────────────────────────────────────────────┐
│                   CODE REPO (source of truth)        │
│                                                      │
│  React components + CSS tokens + figma-sync CLI      │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
     PUSH (write)               PULL (read)
           │                          │
           ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ generate_figma_  │    │ get_design_context (6/month)  │
│ design           │    │ get_variable_defs  (6/month)  │
│ (UNLIMITED)      │    │ get_metadata       (6/month)  │
│                  │    ├──────────────────────────────┤
│ add_code_connect │    │ Figma Plugin bridge          │
│ _map (UNLIMITED) │    │ (UNLIMITED, stretch goal)    │
└────────┬─────────┘    └──────────────┬───────────────┘
         │                             │
         ▼                             ▼
┌──────────────────────────────────────────────────────┐
│                     FIGMA FILE                        │
│  Editable frames · Component mappings · Tokens        │
└──────────────────────────────────────────────────────┘
```

## Epics

| # | Epic | Priority | Depends on |
|---|---|---|---|
| 1 | [Component Mapping](01-component-mapping.md) | 🔴 High | — |
| 2 | [Push Sync (Code → Figma)](02-push-sync.md) | 🔴 High | Epic 1 |
| 3 | [Pull Sync (Figma → Code)](03-pull-sync.md) | 🔴 High | Epic 1 |
| 4 | [Figma Plugin Bridge](04-figma-plugin-bridge.md) | 🟡 Medium | — |
| 5 | [End-to-End Demo](05-e2e-demo.md) | 🔴 High | Epic 1–3 |
| 6 | [Documentation & UI](06-docs-ui.md) | 🟢 Low | — |

## Implementation order

```
Epic 1 (Mapping) → Epic 2 (Push) → Epic 3 (Pull) → Epic 5 (Demo)
                                                  ↗
                    Epic 4 (Plugin, stretch) ─────┘
```

## Out of scope for POC

- Multi-page app sync (one page is enough)
- Real-time / live sync (manual trigger is fine)
- CI/CD integration
- Multi-user conflict resolution

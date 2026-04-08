---
sidebar_position: 1
---

# Why This Approach

## The Problem

Bridging code and Figma design files programmatically is hard. The Figma REST API and the official Figma MCP server are **read-only for design files** — there is no endpoint to create nodes, update text, modify layout, or create components. The only way to write to a Figma file is through the **Figma Plugin API** (`figma.*`), which runs inside the Figma desktop app.

On top of that, key APIs like **Variables** are locked behind the **Enterprise plan**, and REST API rate limits can block automation workflows.

This project solves all of these problems with a custom MCP server that bridges VS Code Copilot to a Figma plugin via WebSocket.

## Figma REST API Cannot Write Design Files

The Figma REST API supports reading files, exporting images, managing comments, and working with webhooks — but it has **zero write endpoints for design file content**.

| Operation | REST API | Plugin API (this project) |
|---|---|---|
| Read node properties | ✅ | ✅ |
| Create components | ❌ No endpoint | ✅ |
| Update fills, text, layout | ❌ No endpoint | ✅ |
| Create instances | ❌ No endpoint | ✅ |
| Delete nodes | ❌ No endpoint | ✅ |
| Reorder children | ❌ No endpoint | ✅ |

The official Figma MCP server (`mcp.figma.com`) also uses the REST API as its backend, so it inherits the same limitation — it can read design context and capture screenshots, but **cannot modify designs**.

## Variables API = Enterprise Only

From the [Figma Variables API docs](https://developers.figma.com/docs/rest-api/variables-endpoints/):

> *"This API is available to **full members of Enterprise orgs**."*

Both GET and POST endpoints for variables return **403 "Limited by Figma plan"** on non-Enterprise plans.

| Operation | REST API | Plugin API (this project) |
|---|---|---|
| Read variables | ⛔ Enterprise only | ✅ Any plan |
| Create variables | ⛔ Enterprise only | ✅ Any plan |
| Update variables | ⛔ Enterprise only | ✅ Any plan |
| Create collections | ⛔ Enterprise only | ✅ Any plan |

The Plugin API has **no plan restrictions** for variable operations.

## Rate Limits — REST API vs Plugin

From the [official Figma rate limit docs](https://developers.figma.com/docs/rest-api/rate-limits/):

| Tier | Starter (View/Collab) | Pro (Full seat) | Enterprise (Full) |
|---|---|---|---|
| Tier 1 (GET files) | **6/month** | 10/min | 20/min |
| Tier 2 (GET variables) | 5/min | 50/min | 100/min |
| Tier 3 (POST variables) | 10/min | 100/min | 150/min |

For a workflow that needs to read/write hundreds of times per session (e.g., creating a DS component page with 30+ variants), these limits are a hard blocker.

**The Plugin API has zero rate limits** — it operates directly inside the Figma app with no HTTP overhead.

## Code Connect = Enterprise Only

Figma's official [Code Connect](https://www.figma.com/developers/code-connect) feature — which links code components to Figma components — requires an **Organization or Enterprise plan**.

This project replicates the same concept locally using:
- `figma.config.json` — project configuration
- `.figma-sync/connections.json` — code ↔ Figma component mappings
- `.figma-sync/layer-map.json` — sub-component layer links

The format is aligned with Code Connect conventions, enabling future migration when upgrading to Enterprise.

## What About Alternatives?

| Alternative | Limitation |
|---|---|
| **Official Figma MCP** | Read-only, rate limited, variables = Enterprise only |
| **Figma REST API directly** | No write endpoints for design files |
| **Code Connect (official)** | Enterprise/Organization plan required |
| **Figma Plugin alone** (no bridge) | Must interact through UI manually — cannot automate from AI agent |
| **Third-party tools** (Anima, Locofy) | One-directional (design → code only), not bidirectional sync |

**No existing solution provides write access + no plan restrictions + AI agent automation.** This is the gap this project fills.

## What the Custom Bridge Enables

| Capability | How |
|---|---|
| **Full read/write** to Figma files | Plugin API via WebSocket bridge |
| **Variables on any plan** | Plugin API bypasses Enterprise restriction |
| **Zero rate limits** | Plugin runs locally inside Figma — no HTTP API calls |
| **AI agent automation** | 24 MCP tools callable by Copilot agent |
| **Local-first config** | `connections.json`, `figma.config.json` read/write without any API |
| **Command queuing** | If plugin disconnects, commands queue and flush on reconnect |
| **Convention-aligned** | Same mapping format as Code Connect → migrate to Enterprise later |

## Trade-offs

This approach is not without trade-offs:

1. **Figma Desktop must be open** with the plugin active — there is no headless mode
2. **Single connection** — only one plugin instance can connect to the bridge at a time
3. **Local only** — the bridge runs on `localhost:9001`, not accessible remotely
4. **Plugin must stay running** — closing the plugin UI disconnects the bridge

These are acceptable trade-offs for a development workflow where the designer/developer already has Figma open.

## Summary

The custom MCP + Plugin bridge approach is **necessary** because:

1. **Write access requires Plugin API** — there is no other programmatic way to modify Figma files
2. **Variables API is Enterprise-only** via REST — the Plugin API bypasses this
3. **Rate limits are zero** through the Plugin vs tens-per-minute through REST
4. **No existing tool** bridges Plugin API ↔ MCP protocol for AI agent automation

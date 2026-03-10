---
sidebar_position: 1
---

# MCP Overview

This project uses the **Figma MCP (Model Context Protocol) server** to connect VS Code Copilot with Figma. MCP tools allow Copilot to read from and write to Figma files programmatically.

## What is MCP?

MCP is a protocol that extends AI assistants (like GitHub Copilot) with the ability to call external tools. The Figma MCP server exposes Figma's capabilities as tools that Copilot can invoke.

## Configuration

The Figma MCP server is configured in `.vscode/mcp.json`:

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

Authentication happens via OAuth when Copilot first calls a Figma MCP tool — a browser window opens for you to authorise.

## Available MCP Tools

### Push Tools (Code → Figma)

| Tool | What it does | Rate Limit |
|---|---|---|
| `generate_figma_design` | Captures a running web page and creates **editable** Figma frames | ✅ Unlimited |
| `add_code_connect_map` | Links a code component to a Figma node | ⛔ Requires Org/Enterprise |

### Pull Tools (Figma → Code)

| Tool | What it does | Rate Limit (Pro) |
|---|---|---|
| `get_design_context` | Returns code, screenshot, and metadata for a Figma node | 200/day |
| `get_variable_defs` | Returns Figma variables (design tokens) | 200/day |
| `get_metadata` | Returns XML tree of node structure | 200/day |
| `get_screenshot` | Returns a screenshot of a node | 200/day |
| `get_code_connect_map` | Returns Code Connect mappings | ⛔ Requires Org/Enterprise |
| `get_code_connect_suggestions` | AI-suggested component mappings | ⛔ Requires Org/Enterprise |

## Using MCP with Copilot

You can trigger MCP tools conversationally in VS Code Agent Mode:

### Push example

> **You:** "Capture my running React app to Figma"
>
> **Copilot:** Calls `generate_figma_design` → captures `localhost:5173` → creates editable frames in a Figma file

### Pull example

> **You:** "Get the design context for the HeaderCard component from Figma"
>
> **Copilot:** Looks up node ID from `.figma-sync/connections.json` → calls `get_design_context` → returns code + screenshot

## Rate Limits by Plan

| Plan | Read calls | Write calls |
|---|---|---|
| Free/Starter | 6/month | Unlimited |
| Pro (Full seat) | **200/day** (10/min) | Unlimited |
| Org/Enterprise | Higher limits | Unlimited + Code Connect |

> **Current account:** Pro plan (PALO IT Thailand) — 200 calls/day.

## Plugin Bridge MCP Tools

In addition to the official Figma MCP server, we run a **custom MCP server** (`figma-bridge`) that connects to a Figma plugin via WebSocket. This enables write operations that the official tools cannot do — and has **no rate limits**.

See the [Bridge section](/docs/bridge/overview) for the full details:

- [Bridge Overview](/docs/bridge/overview) — why a plugin is needed, architecture diagram
- [Commands & MCP Tools](/docs/bridge/commands) — full list of local + plugin commands and MCP tools
- [Message Protocol](/docs/bridge/protocol) — request/response format, routing, queuing
- [Setup Guide](/docs/setup-plugin) — step-by-step setup instructions

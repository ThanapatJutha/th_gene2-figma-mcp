---
sidebar_position: 2
---

# Commands & MCP Tools

The bridge handles two types of commands: **local commands** that run on the server itself, and **plugin commands** that are forwarded to the Figma Plugin.

## Local Commands

These run directly on the bridge server — no Figma desktop needed. They read/write the local filesystem.

| Command | Purpose |
|---|---|
| `ping` | Health check — returns `"pong"` |
| `read-config` | Read `figma.config.json` |
| `save-config` | Write `figma.config.json` |
| `list-project-components` | Scan files matching include/exclude globs from config |
| `list-directories` | List project subdirectories (for Settings root directory dropdown) |
| `read-connections` | Read `.figma-sync/connections.json` |
| `save-connections` | Write `.figma-sync/connections.json` |

### Who calls local commands?

| Caller | How |
|---|---|
| **Settings page** | WebSocket → `read-config`, `save-config`, `list-directories` |
| **Dashboard** | WebSocket → `list-project-components`, `read-connections`, `save-connections` |
| **MCP Server** | In-process → any local command |

## Plugin Commands

These are forwarded over WebSocket to the Figma Plugin running inside the Figma app. The Figma desktop app must be open with the plugin active.

| Command | Purpose |
|---|---|
| `list-components` | List all COMPONENT / COMPONENT_SET nodes in the file |
| `list-layers` | List top-level layers on the current page |
| `create-component` | Convert a frame/group into a reusable Figma Component |
| `read-node` | Read any node's properties (type, name, fills, text, dimensions) |
| `read-tree` | Get the full page node tree as JSON |
| `update-node` | Update text, fills, dimensions, opacity |
| `read-variables` | Read all local variables (design tokens) — works on any plan |
| `create-variable` | Create a new design token |
| `update-variable` | Update a token value |

## MCP Tools

The `figma-bridge` custom MCP server exposes plugin commands as tools that Copilot can call via Agent Mode. These are registered in `.vscode/mcp.json`.

| MCP Tool | Bridge Command | Description |
|---|---|---|
| `bridge_ping` | `ping` | Check if the Figma plugin is connected |
| `bridge_read_node` | `read-node` | Read any node's properties |
| `bridge_read_tree` | `read-tree` | Get the current page's node tree |
| `bridge_list_layers` | `list-layers` | List top-level layers on the current page |
| `bridge_list_components` | `list-components` | List all COMPONENT / COMPONENT_SET nodes |
| **`bridge_create_component`** | `create-component` | **Convert a frame/group into a reusable Component** |
| `bridge_update_node` | `update-node` | Update text content, fills, dimensions, or opacity |
| `bridge_read_variables` | `read-variables` | Read all local variables (design tokens) |
| `bridge_create_variable` | `create-variable` | Create a new design token |
| `bridge_update_variable` | `update-variable` | Update an existing token value |

### Example Copilot Prompts

| What you want | Prompt |
|---|---|
| Check connection | *"Ping the Figma bridge"* |
| Read a node | *"Read the properties of Figma node 1:5 using the bridge"* |
| See the page tree | *"Show me the node tree of the current Figma page"* |
| Convert to component | *"Convert Figma node 1:5 to a component named HeaderCard"* |
| Update text | *"Update the text in Figma node 3:12 to say 'Hello World'"* |
| Read tokens | *"Read all the design variables from my Figma file"* |
| Create token | *"Create a color variable called 'brand-primary' with value #0D99FF in Figma"* |

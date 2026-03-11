---
sidebar_position: 2
---

# Commands & MCP Tools

The bridge handles two types of commands: **local commands** that run on the server itself, and **plugin commands** that are forwarded to the Figma Plugin.

## Local Commands

These run directly on the bridge server (or in-process via `bridge-client.ts`) — no Figma desktop needed. They read/write the local filesystem.

| Command | Purpose |
|---|---|
| `read-config` | Read `figma.config.json` |
| `save-config` | Write `figma.config.json` |
| `list-project-components` | Scan files matching include/exclude globs from config |
| `list-directories` | List subdirectories in the project root |
| `validate-root-dir` | Validate a target project path (exists, has package.json, etc.) |
| `read-connections` | Read `.figma-sync/connections.json` |
| `save-connections` | Write `.figma-sync/connections.json` |
| `read-layer-map` | Read `.figma-sync/layer-map.json` — maps sub-components to Figma layers |
| `save-layer-map` | Write a layer map entry for a parent frame |
| `read-component-source` | Read a code component's source + imported sub-components |

### Who calls local commands?

| Caller | How |
|---|---|
| **Settings page** | WebSocket → `read-config`, `save-config`, `validate-root-dir` |
| **Dashboard** | WebSocket → `list-project-components`, `read-connections`, `save-connections` |
| **MCP Server** | In-process (via `bridge-client.ts`) → any local command |

## Plugin Commands

These are forwarded over WebSocket to the Figma Plugin running inside the Figma app. The Figma desktop app must be open with the plugin active.

### Read Commands

| Command | Purpose |
|---|---|
| `ping` | Health check — returns `"pong"` |
| `read-node` | Read any node's properties (type, name, fills, text, dimensions). Supports `depth` parameter for nested children. |
| `read-tree` | Get a node tree as JSON. Accepts optional `nodeId` to start from a specific node, otherwise reads the full current page. |
| `list-layers` | List all layers on the current page as a flat list |
| `list-components` | List all COMPONENT / COMPONENT_SET nodes and their instances |
| `read-variables` | Read all local variables (design tokens) — works on any plan |

### Write Commands

| Command | Purpose |
|---|---|
| `create-component` | Convert a frame/group into a reusable Figma Component |
| `update-node` | Update text, fills, dimensions, opacity, font, corner radius, padding, strokes |
| `create-instance` | Create an instance of a master component inside a parent frame |
| `create-node` | Create a basic FRAME or TEXT node inside a parent frame |
| `delete-node` | Delete a Figma node by ID. Cannot delete PAGE nodes. |
| `reorder-children` | Reorder the children of a parent frame to match a desired order |
| `create-variable` | Create a new design token |
| `update-variable` | Update a token value |

## MCP Tools

The `figma-bridge` custom MCP server exposes **21 MCP tools** that Copilot can call via Agent Mode. These are registered in `.vscode/mcp.json`.

### Plugin Tools (require Figma desktop open)

| MCP Tool | Bridge Command | Description |
|---|---|---|
| `bridge_ping` | `ping` | Check if the Figma plugin is connected |
| `bridge_read_node` | `read-node` | Read any node's properties (with configurable `depth`) |
| `bridge_read_tree` | `read-tree` | Get a node tree (full page or from a specific `nodeId`) |
| `bridge_list_layers` | `list-layers` | List all layers on the current page as a flat list |
| `bridge_list_components` | `list-components` | List all COMPONENT / COMPONENT_SET nodes |
| `bridge_create_component` | `create-component` | Convert a frame/group into a reusable Component |
| `bridge_update_node` | `update-node` | Update text, fills, dimensions, opacity, font, padding, strokes |
| `bridge_create_instance` | `create-instance` | Create an instance of a master component inside a parent frame |
| `bridge_create_node` | `create-node` | Create a basic FRAME or TEXT node (fallback when no component exists) |
| `bridge_delete_node` | `delete-node` | Delete a Figma node by ID permanently |
| `bridge_reorder_children` | `reorder-children` | Reorder children of a parent frame to match desired order |
| `bridge_read_variables` | `read-variables` | Read all local variables (design tokens) |
| `bridge_create_variable` | `create-variable` | Create a new design token |
| `bridge_update_variable` | `update-variable` | Update an existing token value |

### Local Tools (no Figma desktop needed)

| MCP Tool | Bridge Command | Description |
|---|---|---|
| `bridge_read_config` | `read-config` | Read `figma.config.json` project configuration |
| `bridge_read_connections` | `read-connections` | Read Code Connect links from `.figma-sync/connections.json` |
| `bridge_save_connections` | `save-connections` | Write Code Connect links |
| `bridge_list_project_components` | `list-project-components` | Scan project files for exported components |
| `bridge_read_layer_map` | `read-layer-map` | Read layer map from `.figma-sync/layer-map.json` |
| `bridge_save_layer_map` | `save-layer-map` | Save a layer map entry for a parent frame |
| `bridge_read_component_source` | `read-component-source` | Read a code component's source and its imported sub-components |

### Example Copilot Prompts

| What you want | Prompt |
|---|---|
| Check connection | *"Ping the Figma bridge"* |
| Read a node | *"Read the properties of Figma node 1:5 with depth 3"* |
| See the page tree | *"Show me the node tree of the current Figma page"* |
| Convert to component | *"Convert Figma node 1:5 to a component named HeaderCard"* |
| Update text | *"Update the text in Figma node 3:12 to say 'Hello World'"* |
| Push sync a new child | *"Create an instance of component 8:2 inside parent 1:4"* |
| Fix child order | *"Reorder the children of 1:4 to \[8:2, 51:104, 1:16\]"* |
| Delete a node | *"Delete Figma node 51:104"* |
| Read tokens | *"Read all the design variables from my Figma file"* |
| Create token | *"Create a color variable called 'brand-primary' with value #0D99FF in Figma"* |
| Read component source | *"Read the source code for the HeaderCard component"* |
| Read layer map | *"Show me the layer map for sub-component links"* |

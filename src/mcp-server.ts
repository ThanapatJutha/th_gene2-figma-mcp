/**
 * Custom MCP Server — exposes Figma Plugin Bridge commands as MCP tools.
 *
 * Connects to the Bridge WebSocket server as a client.
 * Registered in .vscode/mcp.json as "figma-bridge".
 *
 * Uses the MCP SDK's stdio transport so VS Code can discover it.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { sendCommand } from './bridge-client.js';
import type { BridgeRequest } from './protocol.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeRequest(
  command: BridgeRequest['command'],
  payload: Record<string, unknown> = {},
): BridgeRequest {
  return { id: randomUUID(), type: 'request', command, payload };
}

async function callPlugin(
  command: BridgeRequest['command'],
  payload: Record<string, unknown> = {},
) {
  const req = makeRequest(command, payload);
  const res = await sendCommand(req);
  if (!res.success) {
    return { content: [{ type: 'text' as const, text: `Error: ${res.error}` }], isError: true };
  }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(res.data, null, 2) }],
  };
}

// ── MCP Server ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'figma-bridge',
  version: '0.1.0',
});

// -- ping --
server.registerTool(
  'bridge_ping',
  {
    description: 'Check if the Figma plugin is connected to the bridge.',
  },
  async () => callPlugin('ping'),
);

// -- read-node --
server.registerTool(
  'bridge_read_node',
  {
    description: 'Read properties of a specific Figma node by ID. Returns type, name, dimensions, fills, text content, and children.',
    inputSchema: {
      nodeId: z.string().describe('Figma node ID, e.g. "1:5"'),
      depth: z.number().optional().default(1).describe('How many levels of children to include (default 1). Use higher values to see nested text nodes.'),
    },
  },
  async ({ nodeId, depth }) => callPlugin('read-node', { nodeId, depth }),
);

// -- read-tree --
server.registerTool(
  'bridge_read_tree',
  {
    description: 'Read a node tree from Figma. If nodeId is provided, reads the subtree rooted at that node; otherwise reads the full current page.',
    inputSchema: {
      nodeId: z.string().optional().describe('Optional Figma node ID to start the tree from. Omit for full page.'),
      maxDepth: z.number().optional().default(4).describe('Maximum tree depth (default 4)'),
    },
  },
  async ({ nodeId, maxDepth }) => callPlugin('read-tree', { nodeId, maxDepth }),
);

// -- create-component --
server.registerTool(
  'bridge_create_component',
  {
    description: 'Convert an existing Figma frame or group into a reusable Figma Component. This is the key tool for turning layers into components.',
    inputSchema: {
      nodeId: z.string().describe('ID of the frame/group to convert to a component, e.g. "1:5"'),
      name: z.string().optional().describe('Optional new name for the component'),
      description: z.string().optional().describe('Optional component description'),
    },
  },
  async ({ nodeId, name, description }) =>
    callPlugin('create-component', { nodeId, name, description }),
);

// -- update-node --
server.registerTool(
  'bridge_update_node',
  {
    description: 'Update properties of a Figma node (position, text, fills, dimensions, opacity, font, corner radius, padding, stroke).',
    inputSchema: {
      nodeId: z.string().describe('Figma node ID'),
      properties: z.object({
        x: z.number().optional().describe('X position'),
        y: z.number().optional().describe('Y position'),
        characters: z.string().optional().describe('New text content (TEXT nodes only)'),
        fills: z.array(z.unknown()).optional().describe('Array of fill paints, e.g. [{ type: "SOLID", color: { r: 0.5, g: 0, b: 1 } }]'),
        width: z.number().optional().describe('New width'),
        height: z.number().optional().describe('New height'),
        opacity: z.number().optional().describe('Opacity 0-1'),
        fontSize: z.number().optional().describe('Font size (TEXT nodes only)'),
        fontName: z.object({
          family: z.string(),
          style: z.string(),
        }).optional().describe('Font name, e.g. { family: "Inter", style: "Bold" } (TEXT nodes only)'),
        cornerRadius: z.number().optional().describe('Corner radius (FRAME/RECTANGLE/COMPONENT)'),
        paddingLeft: z.number().optional().describe('Left padding (auto-layout frames)'),
        paddingRight: z.number().optional().describe('Right padding (auto-layout frames)'),
        paddingTop: z.number().optional().describe('Top padding (auto-layout frames)'),
        paddingBottom: z.number().optional().describe('Bottom padding (auto-layout frames)'),
        strokeWeight: z.number().optional().describe('Stroke/border width'),
        strokes: z.array(z.unknown()).optional().describe('Array of stroke paints'),
      }).describe('Properties to update'),
    },
  },
  async ({ nodeId, properties }) => callPlugin('update-node', { nodeId, properties }),
);

// -- read-variables --
server.registerTool(
  'bridge_read_variables',
  {
    description: 'Read all local Figma variables (design tokens) — works on any plan, no rate limits.',
    inputSchema: { collectionName: z.string().optional().describe('Filter by variable collection name') },
  },
  async ({ collectionName }) => callPlugin('read-variables', { collectionName }),
);

// -- create-variable --
server.registerTool(
  'bridge_create_variable',
  {
    description: 'Create a new Figma variable (design token).',
    inputSchema: {
      name: z.string().describe('Variable name, e.g. "primary-color"'),
      resolvedType: z.enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']).describe('Variable type'),
      collectionId: z.string().describe('ID of the variable collection'),
      value: z.unknown().describe('Initial value'),
    },
  },
  async ({ name, resolvedType, collectionId, value }) =>
    callPlugin('create-variable', { name, resolvedType, collectionId, value }),
);

// -- update-variable --
server.registerTool(
  'bridge_update_variable',
  {
    description: 'Update an existing Figma variable value.',
    inputSchema: {
      variableId: z.string().describe('Variable ID'),
      value: z.unknown().describe('New value'),
      modeId: z.string().optional().describe('Mode ID (for multi-mode variables)'),
    },
  },
  async ({ variableId, value, modeId }) =>
    callPlugin('update-variable', { variableId, value, modeId }),
);

// -- list-layers --
server.registerTool(
  'bridge_list_layers',
  {
    description: 'List all layers on the current Figma page as a flat list. Each layer includes id, name, type, depth, childCount, dimensions, and whether it can be converted to a component. Use this to discover which layers exist and suggest component candidates.',
    inputSchema: { maxDepth: z.number().optional().default(100).describe('Maximum traversal depth (default 100)') },
  },
  async ({ maxDepth }) => callPlugin('list-layers', { maxDepth }),
);

// -- list-components --
server.registerTool(
  'bridge_list_components',
  {
    description: 'List all Figma Component nodes on the current page. Returns id, name, description, dimensions for each component.',
  },
  async () => callPlugin('list-components'),
);

// ── Local commands (no Figma plugin required) ──────────────────────────

// -- read-config --
server.registerTool(
  'bridge_read_config',
  {
    description: 'Read the figma.config.json project configuration. Returns rootDir, figmaFileKey, include/exclude globs.',
  },
  async () => callPlugin('read-config'),
);

// -- read-connections --
server.registerTool(
  'bridge_read_connections',
  {
    description: 'Read all Code Connect links from .figma-sync/connections.json. Each connection maps a code component to a Figma master component node ID.',
  },
  async () => callPlugin('read-connections'),
);

// -- save-connections --
server.registerTool(
  'bridge_save_connections',
  {
    description: 'Save Code Connect links to .figma-sync/connections.json. Replaces the entire connections list.',
    inputSchema: {
      connections: z.array(z.object({
        figmaNodeId: z.string().describe('Figma node ID of the master component'),
        figmaComponentName: z.string().describe('Name of the Figma component'),
        codeComponent: z.string().describe('Code component name'),
        file: z.string().describe('File path relative to rootDir'),
        linkedAt: z.string().describe('ISO 8601 timestamp'),
      })).describe('Array of connection entries'),
    },
  },
  async ({ connections }) => callPlugin('save-connections', { connections }),
);

// -- list-project-components --
server.registerTool(
  'bridge_list_project_components',
  {
    description: 'Scan project files and list exported code components. Uses include/exclude globs from figma.config.json.',
  },
  async () => callPlugin('list-project-components'),
);

// -- read-layer-map --
server.registerTool(
  'bridge_read_layer_map',
  {
    description: 'Read the layer map from .figma-sync/layer-map.json. Maps sub-components in code to specific Figma child nodes inside parent frames.',
  },
  async () => callPlugin('read-layer-map'),
);

// -- save-layer-map --
server.registerTool(
  'bridge_save_layer_map',
  {
    description: 'Save a layer map entry for a parent frame. Records which Figma child nodes correspond to which sub-components in code.',
    inputSchema: {
      parentNodeId: z.string().describe('Figma parent node ID (e.g. "20:1")'),
      frame: z.object({
        codeComponent: z.string().describe('Parent code component name'),
        file: z.string().describe('File path relative to rootDir'),
        children: z.record(z.string(), z.object({
          nodeId: z.string().describe('Figma child node ID'),
          nodeType: z.string().describe('Node type: INSTANCE, FRAME, TEXT, etc.'),
          codeComponent: z.string().optional().describe('Code component name if mapped'),
        })).describe('Map of child name → layer mapping'),
        lastSyncedAt: z.string().describe('ISO 8601 timestamp'),
      }).describe('Frame mapping data'),
    },
  },
  async ({ parentNodeId, frame }) => callPlugin('save-layer-map', { parentNodeId, frame }),
);

// -- read-component-source --
server.registerTool(
  'bridge_read_component_source',
  {
    description: 'Read a code component\'s source file and its imported sub-components (one level deep). Returns source code for the main component and all PascalCase imports.',
    inputSchema: {
      name: z.string().describe('Component name to look up (e.g. "HeaderCard", "Card")'),
    },
  },
  async ({ name }) => callPlugin('read-component-source', { name }),
);

// ── Plugin commands — create instance / node ───────────────────────────

// -- create-instance --
server.registerTool(
  'bridge_create_instance',
  {
    description: 'Create an instance of a Figma master component inside a parent frame. Use this to add new child components during push sync.',
    inputSchema: {
      componentId: z.string().describe('ID of the master component to instantiate (e.g. "30:1")'),
      parentId: z.string().describe('ID of the parent frame to insert the instance into (e.g. "20:1")'),
      name: z.string().optional().describe('Optional name override for the new instance'),
      properties: z.object({
        characters: z.string().optional().describe('Text to set on the first TEXT child'),
        width: z.number().optional().describe('Width override'),
        height: z.number().optional().describe('Height override'),
      }).optional().describe('Initial property overrides'),
    },
  },
  async ({ componentId, parentId, name, properties }) =>
    callPlugin('create-instance', { componentId, parentId, name, properties }),
);

// -- create-node --
server.registerTool(
  'bridge_create_node',
  {
    description: 'Create a basic FRAME or TEXT node inside a parent frame. Use as fallback when no master component exists to instantiate.',
    inputSchema: {
      type: z.enum(['FRAME', 'TEXT']).describe('Node type to create'),
      parentId: z.string().describe('ID of the parent frame to insert into'),
      name: z.string().optional().describe('Name for the new node'),
      properties: z.object({
        characters: z.string().optional().describe('Text content (TEXT nodes only)'),
        width: z.number().optional().describe('Width'),
        height: z.number().optional().describe('Height'),
        fills: z.array(z.unknown()).optional().describe('Fill paints'),
        fontSize: z.number().optional().describe('Font size (TEXT nodes only)'),
        fontName: z.object({
          family: z.string(),
          style: z.string(),
        }).optional().describe('Font (TEXT nodes only)'),
      }).optional().describe('Initial properties'),
    },
  },
  async ({ type, parentId, name, properties }) =>
    callPlugin('create-node', { type, parentId, name, properties }),
);

// -- delete-node --
server.registerTool(
  'bridge_delete_node',
  {
    description: 'Delete a Figma node by ID. Removes it from the canvas permanently. Cannot delete PAGE nodes.',
    inputSchema: {
      nodeId: z.string().describe('Figma node ID to delete, e.g. "51:104"'),
    },
  },
  async ({ nodeId }) => callPlugin('delete-node', { nodeId }),
);

// -- reorder-children --
server.registerTool(
  'bridge_reorder_children',
  {
    description: 'Reorder the children of a Figma parent frame. Provide the parent ID and an array of child IDs in the desired order. All child IDs must be existing children of the parent. Children not in the list will remain but shift to accommodate the reordered ones.',
    inputSchema: {
      parentId: z.string().describe('ID of the parent frame whose children to reorder, e.g. "1:4"'),
      childIds: z.array(z.string()).describe('Array of child node IDs in the desired order, e.g. ["8:2", "51:104", "10:1"]'),
    },
  },
  async ({ parentId, childIds }) => callPlugin('reorder-children', { parentId, childIds }),
);

// ── Page management commands ───────────────────────────────────────────

// -- create-page --
server.registerTool(
  'bridge_create_page',
  {
    description: 'Create a new Figma page with a given name. Use this to set up a dedicated "Components" page before building component frames. Returns the new page ID.',
    inputSchema: {
      name: z.string().describe('Name for the new page, e.g. "📦 Components"'),
    },
  },
  async ({ name }) => callPlugin('create-page', { name }),
);

// -- set-current-page --
server.registerTool(
  'bridge_set_current_page',
  {
    description: 'Switch the Figma plugin\'s active page. Subsequent commands (create-node, list-layers, etc.) will target this page. Required before building components on a non-default page.',
    inputSchema: {
      pageId: z.string().describe('ID of the Figma page to switch to, e.g. "42:1"'),
    },
  },
  async ({ pageId }) => callPlugin('set-current-page', { pageId }),
);

// -- move-node --
server.registerTool(
  'bridge_move_node',
  {
    description: 'Move a Figma node to a different parent (page or frame). The node is removed from its current parent and appended to the target. Works across pages.',
    inputSchema: {
      nodeId: z.string().describe('ID of the node to move, e.g. "50:1"'),
      targetParentId: z.string().describe('ID of the new parent (page or frame), e.g. "42:1"'),
    },
  },
  async ({ nodeId, targetParentId }) => callPlugin('move-node', { nodeId, targetParentId }),
);

// ── Start ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp] figma-bridge MCP server started (stdio)');
}

main().catch((err) => {
  console.error('[mcp] Fatal:', err);
  process.exit(1);
});

/**
 * Custom MCP Server — exposes Figma Plugin Bridge commands as MCP tools.
 *
 * Runs alongside the Bridge WebSocket server.
 * Registered in .vscode/mcp.json as "figma-bridge".
 *
 * Uses the MCP SDK's stdio transport so VS Code can discover it.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { sendToPlugin } from './server.js';
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
  const res = await sendToPlugin(req);
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
    inputSchema: { nodeId: z.string().describe('Figma node ID, e.g. "1:5"') },
  },
  async ({ nodeId }) => callPlugin('read-node', { nodeId }),
);

// -- read-tree --
server.registerTool(
  'bridge_read_tree',
  {
    description: 'Read the current page node tree from Figma. Returns hierarchical JSON of all nodes.',
    inputSchema: { maxDepth: z.number().optional().default(4).describe('Maximum tree depth (default 4)') },
  },
  async ({ maxDepth }) => callPlugin('read-tree', { maxDepth }),
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
    description: 'Update properties of a Figma node (text, fills, dimensions, opacity).',
    inputSchema: {
      nodeId: z.string().describe('Figma node ID'),
      properties: z.object({
        characters: z.string().optional().describe('New text content (TEXT nodes only)'),
        width: z.number().optional().describe('New width'),
        height: z.number().optional().describe('New height'),
        opacity: z.number().optional().describe('Opacity 0-1'),
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

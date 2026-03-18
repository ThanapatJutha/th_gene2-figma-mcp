/**
 * Bridge WebSocket server — relays commands between
 * MCP Server / Copilot and the Figma Plugin.
 *
 * Usage:  node --loader ts-node/esm figma-docs/bridge/src/server.ts
 *    or:  npm run bridge
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeRequest, BridgeResponse, BridgeMessage } from './protocol.js';
import {
  readConfig,
  saveConfig,
  readConnections,
  saveConnections,
  listProjectComponents,
  listDirectories,
  validateRootDir,
  readLayerMap,
  saveLayerMap,
  readComponentSource,
} from './local-handlers.js';

const PORT = Number(process.env.BRIDGE_PORT ?? 9001);

// ── State ──────────────────────────────────────────────────────────────

let pluginSocket: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
}>();
const commandQueue: BridgeRequest[] = [];

// ── Server ─────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`[bridge] WebSocket server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin ?? 'unknown';
  const isPlugin = origin.includes('figma') || req.url === '/plugin';

  if (isPlugin) {
    pluginSocket = ws;
    console.log('[bridge] ✅ Figma plugin connected');

    // Flush queued commands
    while (commandQueue.length > 0) {
      const queued = commandQueue.shift()!;
      console.log(`[bridge] Flushing queued command: ${queued.command} (${queued.id})`);
      ws.send(JSON.stringify(queued));
    }
  } else {
    console.log('[bridge] 🔌 MCP/client connected');
  }

  ws.on('message', (raw) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(String(raw)) as BridgeMessage;
    } catch {
      console.error('[bridge] Invalid JSON received');
      return;
    }

    if (msg.type === 'request') {
      handleRequest(msg as BridgeRequest, ws);
    } else if (msg.type === 'response') {
      handleResponse(msg as BridgeResponse);
    }
  });

  ws.on('close', () => {
    if (ws === pluginSocket) {
      pluginSocket = null;
      console.log('[bridge] ❌ Figma plugin disconnected');
    } else {
      console.log('[bridge] 🔌 MCP/client disconnected');
    }
  });

  ws.on('error', (err) => {
    console.error('[bridge] WebSocket error:', err.message);
  });
});

// ── Request handling ───────────────────────────────────────────────────

/** Commands handled locally on the server (no plugin round-trip). */
const LOCAL_COMMANDS = new Set([
  'ping',
  'read-config',
  'save-config',
  'list-project-components',
  'list-directories',
  'validate-root-dir',
  'read-connections',
  'save-connections',
  'read-layer-map',
  'save-layer-map',
  'read-component-source',
]);

async function handleLocalCommand(req: BridgeRequest): Promise<BridgeResponse> {
  try {
    switch (req.command) {
      case 'ping':
        return { id: req.id, type: 'response', success: true, data: 'pong' };

      case 'read-config': {
        const config = await readConfig();
        return { id: req.id, type: 'response', success: true, data: config };
      }

      case 'save-config': {
        await saveConfig(req.payload.config as Parameters<typeof saveConfig>[0]);
        return { id: req.id, type: 'response', success: true, data: { saved: true } };
      }

      case 'list-project-components': {
        const components = await listProjectComponents();
        return { id: req.id, type: 'response', success: true, data: { components } };
      }

      case 'list-directories': {
        const directories = await listDirectories();
        return { id: req.id, type: 'response', success: true, data: { directories } };
      }

      case 'validate-root-dir': {
        const info = await validateRootDir(req.payload.path as string);
        return { id: req.id, type: 'response', success: true, data: info };
      }

      case 'read-connections': {
        const store = await readConnections();
        return { id: req.id, type: 'response', success: true, data: store };
      }

      case 'save-connections': {
        await saveConnections(req.payload.connections as Parameters<typeof saveConnections>[0]);
        return { id: req.id, type: 'response', success: true, data: { saved: true } };
      }

      case 'read-layer-map': {
        const store = await readLayerMap();
        return { id: req.id, type: 'response', success: true, data: store };
      }

      case 'save-layer-map': {
        const parentNodeId = req.payload.parentNodeId as string;
        const frame = req.payload.frame as Parameters<typeof saveLayerMap>[1];
        await saveLayerMap(parentNodeId, frame);
        return { id: req.id, type: 'response', success: true, data: { saved: true } };
      }

      case 'read-component-source': {
        const result = await readComponentSource(req.payload.name as string);
        return { id: req.id, type: 'response', success: true, data: result };
      }

      default:
        return { id: req.id, type: 'response', success: false, error: `Unknown local command: ${req.command}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { id: req.id, type: 'response', success: false, error: message };
  }
}

function handleRequest(req: BridgeRequest, sender: WebSocket) {
  // Handle server-side commands locally
  if (LOCAL_COMMANDS.has(req.command)) {
    console.log(`[bridge] local: ${req.command} (${req.id})`);
    handleLocalCommand(req).then((res) => {
      sender.send(JSON.stringify(res));
    });
    return;
  }

  // Forward to plugin
  if (!pluginSocket || pluginSocket.readyState !== WebSocket.OPEN) {
    console.log(`[bridge] Plugin not connected, queuing: ${req.command} (${req.id})`);
    commandQueue.push(req);
    const res: BridgeResponse = {
      id: req.id,
      type: 'response',
      success: false,
      error: 'Figma plugin not connected. Command queued — it will execute when the plugin connects.',
    };
    sender.send(JSON.stringify(res));
    return;
  }

  console.log(`[bridge] → plugin: ${req.command} (${req.id})`);
  pluginSocket.send(JSON.stringify(req));

  // Wait for plugin response and relay back to sender
  const timeout = 30_000;
  const timer = setTimeout(() => {
    pendingRequests.delete(req.id);
    const res: BridgeResponse = { id: req.id, type: 'response', success: false, error: 'Plugin response timeout (30s)' };
    sender.send(JSON.stringify(res));
  }, timeout);

  pendingRequests.set(req.id, {
    resolve: (res) => {
      sender.send(JSON.stringify(res));
    },
    timer,
  });
}

function handleResponse(res: BridgeResponse) {
  const pending = pendingRequests.get(res.id);
  if (pending) {
    clearTimeout(pending.timer);
    pendingRequests.delete(res.id);
    console.log(`[bridge] ← plugin: ${res.id} success=${res.success}`);
    pending.resolve(res);
  }
}

// ── Public API for MCP server (in-process) ─────────────────────────────

/**
 * Send a command to the Figma plugin and wait for a response.
 * Used by the MCP server running in the same process.
 */
export function sendToPlugin(req: BridgeRequest): Promise<BridgeResponse> {
  // Handle server-side commands locally (no plugin needed)
  if (LOCAL_COMMANDS.has(req.command)) {
    return handleLocalCommand(req);
  }

  return new Promise((resolve) => {
    if (!pluginSocket || pluginSocket.readyState !== WebSocket.OPEN) {
      commandQueue.push(req);
      resolve({
        id: req.id,
        type: 'response',
        success: false,
        error: 'Figma plugin not connected. Command queued.',
      });
      return;
    }

    console.log(`[bridge] → plugin: ${req.command} (${req.id})`);
    pluginSocket.send(JSON.stringify(req));

    const timer = setTimeout(() => {
      pendingRequests.delete(req.id);
      resolve({ id: req.id, type: 'response', success: false, error: 'Plugin response timeout (30s)' });
    }, 30_000);

    pendingRequests.set(req.id, { resolve, timer });
  });
}

export { wss, PORT };

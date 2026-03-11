/**
 * Bridge Client — WebSocket client that connects to the Bridge server.
 *
 * Used by the MCP server (mcp-server.ts) to send commands through
 * the bridge to the Figma plugin, WITHOUT starting a second server.
 *
 * Handles:
 *  - Local commands (read-config, read-connections, etc.) directly
 *  - Plugin commands by forwarding through the bridge WebSocket
 */

import WebSocket from 'ws';
import type { BridgeRequest, BridgeResponse } from './protocol.js';
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

const BRIDGE_URL = `ws://localhost:${process.env.BRIDGE_PORT ?? 9001}`;

// ── Local command handling ──────────────────────────────────────────────

const LOCAL_COMMANDS = new Set([
  'read-config',
  'save-config',
  'read-connections',
  'save-connections',
  'list-project-components',
  'list-directories',
  'validate-root-dir',
  'read-layer-map',
  'save-layer-map',
  'read-component-source',
]);

async function handleLocalCommand(req: BridgeRequest): Promise<BridgeResponse> {
  try {
    switch (req.command) {
      case 'read-config': {
        const config = await readConfig();
        return { id: req.id, type: 'response', success: true, data: config };
      }
      case 'save-config': {
        await saveConfig(req.payload as any);
        return { id: req.id, type: 'response', success: true, data: { saved: true } };
      }
      case 'read-connections': {
        const store = await readConnections();
        return { id: req.id, type: 'response', success: true, data: store };
      }
      case 'save-connections': {
        await saveConnections(req.payload.connections as any);
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
        const result = await validateRootDir(req.payload.rootDir as string);
        return { id: req.id, type: 'response', success: true, data: result };
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

// ── WebSocket client to bridge ──────────────────────────────────────────

let ws: WebSocket | null = null;
let connected = false;
const pendingRequests = new Map<string, {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function ensureConnection(): Promise<void> {
  if (ws && connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    ws = new WebSocket(BRIDGE_URL);

    ws.on('open', () => {
      connected = true;
      console.error('[mcp-client] Connected to bridge');
      resolve();
    });

    ws.on('message', (data) => {
      try {
        const msg: BridgeResponse = JSON.parse(data.toString());
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          pendingRequests.delete(msg.id);
          pending.resolve(msg);
        }
      } catch {
        // ignore non-JSON messages
      }
    });

    ws.on('close', () => {
      connected = false;
      ws = null;
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.resolve({ id, type: 'response', success: false, error: 'Bridge connection closed' });
      }
      pendingRequests.clear();
    });

    ws.on('error', (err) => {
      connected = false;
      reject(new Error(`Cannot connect to bridge at ${BRIDGE_URL}: ${err.message}`));
    });
  });
}

/**
 * Send a command through the bridge and return the response.
 * Local commands are handled in-process; plugin commands go over WebSocket.
 */
export async function sendCommand(req: BridgeRequest): Promise<BridgeResponse> {
  // Handle local commands directly (no bridge round-trip needed)
  if (LOCAL_COMMANDS.has(req.command)) {
    return handleLocalCommand(req);
  }

  // Plugin commands — forward through the bridge
  await ensureConnection();

  return new Promise((resolve) => {
    if (!ws || !connected) {
      resolve({ id: req.id, type: 'response', success: false, error: 'Not connected to bridge' });
      return;
    }

    const timer = setTimeout(() => {
      pendingRequests.delete(req.id);
      resolve({ id: req.id, type: 'response', success: false, error: 'Plugin response timeout (30s)' });
    }, 30_000);

    pendingRequests.set(req.id, { resolve, timer });
    ws.send(JSON.stringify(req));
  });
}

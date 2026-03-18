/**
 * Bridge WebSocket server — relays commands between
 * MCP Server / Copilot and the Figma Plugin.
 *
 * Also serves the dashboard UI as static files on the same port:
 *   http://localhost:9001/ui/
 *
 * Usage:  npx gene2-figma-mcp bridge
 *    or:  npm run bridge
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Dashboard static file serving ──────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/** Resolve the dashboard dist directory. Tries multiple locations. */
function findDashboardDir(): string | null {
  const candidates = [
    resolve(__dirname, '..', '..', 'dashboard', 'dist'),       // from src/bridge/ → dashboard/dist
    resolve(__dirname, '..', 'dashboard', 'dist'),              // from dist/ → dashboard/dist
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) return dir;
  }
  return null;
}

function serveDashboard(req: IncomingMessage, res: ServerResponse): void {
  const dashboardDir = findDashboardDir();

  // If dashboard is not built, show a helpful message
  if (!dashboardDir) {
    if (req.url === '/ui/' || req.url === '/ui') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!doctype html><html><head><title>Dashboard not built</title></head><body style="font-family:system-ui;padding:48px;text-align:center;background:#121212;color:#e3e3e3">
        <h1>⚡ Dashboard not built yet</h1>
        <p>Run <code style="background:#2a2a2a;padding:4px 8px;border-radius:4px">cd packages/gene2-figma-mcp/dashboard && npm run build</code> to build the dashboard.</p>
        <p style="color:#888;margin-top:24px">Bridge WebSocket is running on this port.</p>
      </body></html>`);
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Strip /ui prefix and resolve file
  let urlPath = (req.url || '/').replace(/\?.*$/, ''); // remove query string
  urlPath = urlPath.replace(/^\/ui\/?/, '/');
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = resolve(dashboardDir, '.' + urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(dashboardDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Try exact file, then fallback to index.html (SPA routing)
  let target = filePath;
  if (!existsSync(target) || !statSync(target).isFile()) {
    target = resolve(dashboardDir, 'index.html');
  }

  try {
    const data = readFileSync(target);
    const ext = extname(target).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end('Internal server error');
  }
}

function handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url || '/';

  // CORS headers for dashboard WebSocket
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Serve dashboard at /ui/*
  if (url.startsWith('/ui')) {
    serveDashboard(req, res);
    return;
  }

  // Root redirect to /ui/
  if (url === '/' || url === '') {
    res.writeHead(302, { Location: '/ui/' });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

// ── State ──────────────────────────────────────────────────────────────

let pluginSocket: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (res: BridgeResponse) => void;
  timer: ReturnType<typeof setTimeout>;
}>();
const commandQueue: BridgeRequest[] = [];

// ── Server ─────────────────────────────────────────────────────────────

const httpServer = createServer(handleHttpRequest);
const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(PORT, () => {
  console.log(`[bridge] WebSocket server listening on ws://localhost:${PORT}`);
  console.log(`[bridge] Dashboard UI available at http://localhost:${PORT}/ui/`);
});

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

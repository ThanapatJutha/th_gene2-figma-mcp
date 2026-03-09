/**
 * Bridge protocol — shared message types between
 * the Bridge Server, Figma Plugin, and MCP Server.
 */

// ── Request / Response envelope ────────────────────────────────────────

export interface BridgeRequest {
  id: string;
  type: 'request';
  command: BridgeCommand;
  payload: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  type: 'response';
  success: boolean;
  data?: unknown;
  error?: string;
}

export type BridgeMessage = BridgeRequest | BridgeResponse;

// ── Commands the plugin can execute ────────────────────────────────────

export type BridgeCommand =
  | 'ping'
  | 'read-node'
  | 'read-tree'
  | 'update-node'
  | 'create-component'
  | 'read-variables'
  | 'update-variable'
  | 'create-variable';

// ── Payload types per command ──────────────────────────────────────────

export interface ReadNodePayload {
  nodeId: string;
}

export interface ReadTreePayload {
  maxDepth?: number;
}

export interface UpdateNodePayload {
  nodeId: string;
  properties: {
    characters?: string;
    fills?: unknown[];
    width?: number;
    height?: number;
    opacity?: number;
  };
}

export interface CreateComponentPayload {
  nodeId: string;            // existing frame/group to convert
  name?: string;             // optional rename
  description?: string;      // component description
}

export interface ReadVariablesPayload {
  collectionName?: string;   // filter by collection
}

export interface UpdateVariablePayload {
  variableId: string;
  value: unknown;
  modeId?: string;
}

export interface CreateVariablePayload {
  name: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  collectionId: string;
  value: unknown;
}

// ── Serialised node shapes (returned from plugin) ──────────────────────

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  characters?: string;       // TEXT nodes
  fills?: unknown[];
  children?: SerializedNode[];
}

export interface SerializedVariable {
  id: string;
  name: string;
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
  collectionName: string;
}

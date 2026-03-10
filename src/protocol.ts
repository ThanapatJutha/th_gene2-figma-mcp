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
  | 'create-variable'
  | 'list-layers'
  | 'list-components'
  // ── Server-side commands (no plugin round-trip) ──
  | 'read-config'
  | 'save-config'
  | 'list-project-components'
  | 'list-directories'
  | 'validate-root-dir'
  | 'read-connections'
  | 'save-connections';

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

// ── Config & connections types (Code Connect aligned) ──────────────────

export interface FigmaSyncConfig {
  codeConnect: {
    parser: string;          // e.g. "react", "html", "vue", "swift"
    include: string[];       // glob patterns relative to rootDir
    exclude: string[];       // glob patterns to skip
    label: string;           // label shown in Figma Dev Mode
    language: string;        // syntax highlighting language
  };
  figmaFileKey: string;      // default Figma file key
  rootDir: string;           // project root (relative to config file)
}

export interface SaveConfigPayload {
  config: FigmaSyncConfig;
}

export interface CodeConnection {
  figmaNodeId: string;       // Figma node ID, e.g. "1:5"
  figmaComponentName: string; // Name in Figma, e.g. "HeaderCard"
  codeComponent: string;     // Code component name, e.g. "HeaderCard"
  file: string;              // File path relative to rootDir
  linkedAt: string;          // ISO 8601 timestamp
}

export interface ConnectionsStore {
  version: 1;
  connections: CodeConnection[];
}

export interface SaveConnectionsPayload {
  connections: CodeConnection[];
}

export interface ProjectComponent {
  name: string;              // exported component name
  file: string;              // file path relative to rootDir
  exportType: 'default' | 'named'; // how it's exported
}


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
  | 'create-instance'
  | 'create-node'
  | 'combine-as-variants'
  | 'read-variables'
  | 'update-variable'
  | 'create-variable'
  | 'create-collection'
  | 'list-layers'
  | 'list-components'
  | 'delete-node'
  | 'reorder-children'
  // ── Page management commands ──
  | 'create-page'
  | 'set-current-page'
  | 'move-node'
  | 'swap-with-instance'
  | 'promote-and-combine'
  | 'swap-batch'
  | 'read-text-styles'
  // ── Server-side commands (no plugin round-trip) ──
  | 'read-config'
  | 'save-config'
  | 'list-project-components'
  | 'list-directories'
  | 'validate-root-dir'
  | 'read-connections'
  | 'save-connections'
  // ── Layer map commands ──
  | 'read-layer-map'
  | 'save-layer-map'
  // ── Component source reader ──
  | 'read-component-source'
  // ── Figma component spec files (.figma.ts) ──
  | 'read-component-spec'
  | 'save-component-spec'
  | 'list-component-specs';

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
    fontSize?: number;
    fontName?: { family: string; style: string };
    cornerRadius?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    strokeWeight?: number;
    strokes?: unknown[];
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

export interface CreateInstancePayload {
  componentId: string;       // Master component node ID
  parentId: string;          // Parent frame/component to insert into
  name?: string;             // Optional name override
  properties?: {             // Initial property overrides
    characters?: string;
    width?: number;
    height?: number;
  };
}

export interface CreateNodePayload {
  type: 'FRAME' | 'TEXT';    // Node type to create
  parentId: string;          // Parent frame/component to insert into
  name?: string;
  properties?: {
    characters?: string;     // TEXT nodes only
    width?: number;
    height?: number;
    fills?: unknown[];
    fontSize?: number;
    fontName?: { family: string; style: string };
  };
}

export interface ReadComponentSourcePayload {
  name: string;              // Component name to look up
}

export interface ReadComponentSpecPayload {
  name: string;              // Spec name without extension, e.g. "Button"
}

export interface SaveComponentSpecPayload {
  name: string;              // Spec name without extension, e.g. "Button"
  content: string;           // Full TypeScript file content
}

export interface DeleteNodePayload {
  nodeId: string;            // Figma node ID to delete
}

export interface ReorderChildrenPayload {
  parentId: string;          // Parent frame whose children to reorder
  childIds: string[];        // Ordered list of child IDs (new order)
}

// ── Page management payloads ───────────────────────────────────────────

export interface CreatePagePayload {
  name: string;              // Name for the new page, e.g. "📦 Components"
}

export interface SetCurrentPagePayload {
  pageId: string;            // ID of the page to switch to
}

export interface MoveNodePayload {
  nodeId: string;            // ID of the node to move
  targetParentId: string;    // ID of the new parent (page or frame)
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
  fontSize?: number;         // TEXT nodes
  fontName?: { family: string; style: string }; // TEXT nodes
  cornerRadius?: number;     // FRAME/RECTANGLE/COMPONENT
  paddingLeft?: number;      // Auto-layout frames
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  strokeWeight?: number;
  strokes?: unknown[];
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
  componentSpecDir?: string; // local design-contract path (default: figma/components)
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

// ── Layer map types (sub-component ↔ Figma layer/instance) ─────────────
// Unlike CodeConnection (component ↔ master component), a LayerMap
// records which specific Figma child nodes inside a parent frame
// correspond to sub-components in code. Auto-generated during push sync.

export interface LayerMapping {
  nodeId: string;            // Figma child node ID, e.g. "20:5"
  nodeType: string;          // "INSTANCE" | "FRAME" | "TEXT" | etc.
  codeComponent?: string;    // Code component name if it maps to one
}

export interface LayerFrame {
  codeComponent: string;     // Parent code component, e.g. "Card"
  file: string;              // File path relative to rootDir
  children: Record<string, LayerMapping>; // key = child name (e.g. "Button1")
  lastSyncedAt: string;      // ISO 8601 timestamp
}

export interface LayerMapStore {
  version: 1;
  frames: Record<string, LayerFrame>; // key = parent Figma node ID (e.g. "20:1")
}

export interface SaveLayerMapPayload {
  parentNodeId: string;      // Figma parent node ID
  frame: LayerFrame;         // The frame data to save/update
}

// ── Figma component spec layer types ──────────────────────────────────

export interface FigmaComponentTypography {
  fontSize?: number;
  fontName?: { family: string; style: string };
  lineHeight?: unknown;
  letterSpacing?: unknown;
}

export interface FigmaComponentStyle {
  fills?: unknown[];
  strokes?: unknown[];
  strokeWeight?: number;
  cornerRadius?: number;
  opacity?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  typography?: FigmaComponentTypography;
}

export interface FigmaComponentSpecNode {
  id: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  style?: FigmaComponentStyle;
  children?: FigmaComponentSpecNode[];
}

export interface FigmaComponentSpec {
  specVersion: 1;
  figmaNodeId: string;
  figmaComponentName: string;
  codeComponent: string;
  file: string;
  linkedAt: string;
  source: 'figma-sync';
  root: FigmaComponentSpecNode;
}


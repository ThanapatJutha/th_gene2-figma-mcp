/**
 * Schema for figma-sync.map.json — the local mapping cache that links
 * React components to their corresponding Figma nodes.
 */

export type ComponentMapping = {
  /** React component name, e.g. "HeaderCard" */
  name: string;
  /** Path to the component file relative to repo root, e.g. "poc-react/src/components/HeaderCard.tsx" */
  file: string;
  /** Figma node ID, e.g. "1:23" */
  figmaNodeId: string;
  /** Figma file key, e.g. "EDZG608izjCi1omcemuN5w" */
  figmaFileKey: string;
  /** CSS selector to target this component in the DOM (for push sync) */
  selector?: string;
};

export type FigmaSyncMap = {
  /** Schema version for forward compatibility */
  version: 1;
  /** The default Figma file key for this project */
  figmaFileKey: string;
  /** Component-to-node mappings */
  components: ComponentMapping[];
};

/** Figma API file response types (subset) */
export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type FigmaFileResponse = {
  name: string;
  lastModified: string;
  version: string;
  document: FigmaNode;
};

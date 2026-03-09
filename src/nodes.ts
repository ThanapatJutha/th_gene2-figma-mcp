import type { FigmaNode } from './types.js';

export type FlatNode = {
  id: string;
  name: string;
  type: string;
  depth: number;
  childCount: number;
  text?: string;
  bounds?: { width: number; height: number };
};

/**
 * Flatten a Figma node tree into a readable list.
 * Optionally filter by type (e.g., "FRAME", "TEXT", "COMPONENT").
 */
export function flattenNodes(
  root: FigmaNode,
  options?: { maxDepth?: number; types?: string[] }
): FlatNode[] {
  const result: FlatNode[] = [];
  const maxDepth = options?.maxDepth ?? 6;
  const types = options?.types ? new Set(options.types.map((t) => t.toUpperCase())) : null;

  function walk(node: FigmaNode, depth: number) {
    if (depth > maxDepth) return;

    const childCount = node.children?.length ?? 0;
    const flat: FlatNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      depth,
      childCount,
    };

    if (node.characters) flat.text = node.characters.slice(0, 80);
    if (node.absoluteBoundingBox) {
      flat.bounds = {
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height),
      };
    }

    if (!types || types.has(node.type)) {
      result.push(flat);
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);
  return result;
}

/**
 * Print a tree view of Figma nodes to the console.
 */
export function printNodeTree(nodes: FlatNode[]): void {
  for (const node of nodes) {
    const indent = '  '.repeat(node.depth);
    const info = [node.type, node.id];
    if (node.bounds) info.push(`${node.bounds.width}×${node.bounds.height}`);
    if (node.text) info.push(`"${node.text}"`);
    if (node.childCount > 0) info.push(`(${node.childCount} children)`);
    console.log(`${indent}${node.name}  [${info.join(' | ')}]`);
  }
}

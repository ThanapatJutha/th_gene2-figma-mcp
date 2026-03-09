import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { FigmaSyncMap, ComponentMapping } from './types.js';

const DEFAULT_MAP_PATH = 'figma-sync.map.json';

/**
 * Read the local mapping file. Returns null if it doesn't exist.
 */
export async function readMap(mapPath?: string): Promise<FigmaSyncMap | null> {
  const filePath = resolve(mapPath ?? DEFAULT_MAP_PATH);
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as FigmaSyncMap;
  } catch {
    return null;
  }
}

/**
 * Write the mapping file to disk.
 */
export async function writeMap(map: FigmaSyncMap, mapPath?: string): Promise<string> {
  const filePath = resolve(mapPath ?? DEFAULT_MAP_PATH);
  await writeFile(filePath, JSON.stringify(map, null, 2) + '\n', 'utf8');
  return filePath;
}

/**
 * Create an empty map structure.
 */
export function createEmptyMap(figmaFileKey: string): FigmaSyncMap {
  return {
    version: 1,
    figmaFileKey,
    components: [],
  };
}

/**
 * Add or update a component mapping.
 */
export function upsertComponent(map: FigmaSyncMap, component: ComponentMapping): void {
  const idx = map.components.findIndex(
    (c) => c.name === component.name || c.figmaNodeId === component.figmaNodeId
  );
  if (idx >= 0) {
    map.components[idx] = component;
  } else {
    map.components.push(component);
  }
}

/**
 * Find a component mapping by name.
 */
export function findComponent(map: FigmaSyncMap, name: string): ComponentMapping | undefined {
  return map.components.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

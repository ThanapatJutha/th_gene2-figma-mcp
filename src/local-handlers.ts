/**
 * Server-side handlers for local filesystem commands.
 * These run on the bridge server — no Figma plugin round-trip needed.
 *
 * Aligned with Figma Code Connect conventions:
 * - Config:       figma.config.json  (project root)
 * - Connections:  .figma-sync/connections.json  (local DB)
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, basename, extname, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { glob } from 'glob';
import type {
  FigmaSyncConfig,
  ConnectionsStore,
  CodeConnection,
  ProjectComponent,
} from './protocol.js';

// ── Paths ──────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(process.cwd());
const CONFIG_PATH = resolve(PROJECT_ROOT, 'figma.config.json');
const DB_DIR = resolve(PROJECT_ROOT, '.figma-sync');
const CONNECTIONS_PATH = resolve(DB_DIR, 'connections.json');

// ── Config ─────────────────────────────────────────────────────────────

export async function readConfig(): Promise<FigmaSyncConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as FigmaSyncConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(config: FigmaSyncConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// ── Connections DB ─────────────────────────────────────────────────────

async function ensureDbDir(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    await mkdir(DB_DIR, { recursive: true });
  }
}

export async function readConnections(): Promise<ConnectionsStore> {
  try {
    const raw = await readFile(CONNECTIONS_PATH, 'utf8');
    return JSON.parse(raw) as ConnectionsStore;
  } catch {
    return { version: 1, connections: [] };
  }
}

export async function saveConnections(connections: CodeConnection[]): Promise<void> {
  await ensureDbDir();
  const store: ConnectionsStore = { version: 1, connections };
  await writeFile(CONNECTIONS_PATH, JSON.stringify(store, null, 2) + '\n', 'utf8');
}

// ── Project component scanner ──────────────────────────────────────────

/**
 * List subdirectories in the project root (one level deep)
 * for the Settings page root-directory dropdown.
 * Always includes "." as the first entry.
 */
export async function listDirectories(): Promise<string[]> {
  const dirs: string[] = ['.'];
  const SKIP = new Set(['.git', '.figma-sync', 'node_modules', 'dist', '.docusaurus', 'build', '.next', '.cache']);

  try {
    const entries = await readdir(PROJECT_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      dirs.push(entry.name);

      // Also scan one level deeper for common patterns like demo/src
      try {
        const subPath = resolve(PROJECT_ROOT, entry.name);
        const subEntries = await readdir(subPath, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isDirectory() && !sub.name.startsWith('.') && !SKIP.has(sub.name)) {
            dirs.push(`${entry.name}/${sub.name}`);
          }
        }
      } catch {
        // Skip unreadable subdirs
      }
    }
  } catch {
    // Return just "." if we can't read the root
  }

  return dirs;
}

/**
 * Scan project files matching the include/exclude globs from config
 * and extract exported component names.
 *
 * Uses a lightweight regex-based approach (no full AST parse)
 * to detect:
 *   - export default function ComponentName
 *   - export default class ComponentName
 *   - export default ComponentName
 *   - export function ComponentName
 *   - export class ComponentName
 *   - export const ComponentName
 */
export async function listProjectComponents(): Promise<ProjectComponent[]> {
  const config = await readConfig();
  if (!config) {
    throw new Error('No figma.config.json found. Please configure the project first.');
  }

  const rootDir = resolve(PROJECT_ROOT, config.rootDir || '.');
  const results: ProjectComponent[] = [];

  // Collect files matching include patterns
  const allFiles = new Set<string>();

  for (const pattern of config.codeConnect.include) {
    try {
      const matches = await glob(pattern, { cwd: rootDir });
      for (const file of matches) {
        allFiles.add(file);
      }
    } catch {
      // Skip invalid patterns
    }
  }

  // Filter out excluded patterns
  const excludeSet = new Set<string>();
  for (const pattern of config.codeConnect.exclude) {
    try {
      const matches = await glob(pattern, { cwd: rootDir });
      for (const file of matches) {
        excludeSet.add(file);
      }
    } catch {
      // Skip invalid patterns
    }
  }

  for (const file of allFiles) {
    if (excludeSet.has(file)) continue;

    const fullPath = resolve(rootDir, file);
    try {
      const content = await readFile(fullPath, 'utf8');
      const components = extractExports(content, file);
      results.push(...components);
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by name
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

function extractExports(content: string, file: string): ProjectComponent[] {
  const components: ProjectComponent[] = [];
  const seen = new Set<string>();

  // Match: export default function/class ComponentName
  const defaultFnMatch = content.match(/export\s+default\s+(?:function|class)\s+([A-Z]\w*)/);
  if (defaultFnMatch && !seen.has(defaultFnMatch[1])) {
    seen.add(defaultFnMatch[1]);
    components.push({ name: defaultFnMatch[1], file, exportType: 'default' });
  }

  // Match: export default ComponentName  (standalone, PascalCase)
  if (!defaultFnMatch) {
    const defaultVarMatch = content.match(/export\s+default\s+([A-Z]\w*)\s*;/);
    if (defaultVarMatch && !seen.has(defaultVarMatch[1])) {
      seen.add(defaultVarMatch[1]);
      components.push({ name: defaultVarMatch[1], file, exportType: 'default' });
    }
  }

  // Match: export function/class/const ComponentName (named exports, PascalCase only)
  const namedRegex = /export\s+(?:function|class|const)\s+([A-Z]\w*)/g;
  let match: RegExpExecArray | null;
  while ((match = namedRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      components.push({ name: match[1], file, exportType: 'named' });
    }
  }

  // Fallback: if nothing found, use filename as component name
  // (only for .tsx/.jsx files, assuming it's a component)
  if (components.length === 0) {
    const ext = extname(file);
    if (['.tsx', '.jsx'].includes(ext)) {
      const name = basename(file, ext);
      if (/^[A-Z]/.test(name)) {
        components.push({ name, file, exportType: 'default' });
      }
    }
  }

  return components;
}

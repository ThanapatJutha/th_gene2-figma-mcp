/**
 * Server-side handlers for local filesystem commands.
 * These run on the bridge server — no Figma plugin round-trip needed.
 *
 * Aligned with Figma Code Connect conventions:
 * - Config:       Figma/config/figma.config.json
 * - Connections:  Figma/config/.figma-sync/connections.json
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
  LayerMapStore,
  LayerFrame,
} from './protocol.js';

// ── Paths ──────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(process.cwd());
const FIGMA_HOME = resolve(PROJECT_ROOT, 'Figma');
const CONFIG_PATH = existsSync(resolve(FIGMA_HOME, 'config', 'figma.config.json'))
  ? resolve(FIGMA_HOME, 'config', 'figma.config.json')
  : resolve(PROJECT_ROOT, 'figma.config.json');
const DB_DIR = resolve(FIGMA_HOME, 'config', '.figma-sync');
const CONNECTIONS_PATH = resolve(DB_DIR, 'connections.json');
const LAYER_MAP_PATH = resolve(DB_DIR, 'layer-map.json');
const DEFAULT_COMPONENT_SPEC_DIR = 'Figma/config/components';

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

// ── Root dir validation ────────────────────────────────────────────────

export interface RootDirInfo {
  exists: boolean;
  resolvedPath: string;
  hasPackageJson: boolean;
  hasSrcDir: boolean;
}

/**
 * Validate a root directory path.
 * Accepts relative paths (resolved from PROJECT_ROOT) or absolute paths.
 * Returns info about whether the path exists and looks like a valid project.
 */
export async function validateRootDir(dirPath: string): Promise<RootDirInfo> {
  const resolvedPath = resolve(PROJECT_ROOT, dirPath);
  const exists = existsSync(resolvedPath);

  let hasPackageJson = false;
  let hasSrcDir = false;

  if (exists) {
    hasPackageJson = existsSync(resolve(resolvedPath, 'package.json'));
    hasSrcDir = existsSync(resolve(resolvedPath, 'src'));
  }

  return { exists, resolvedPath, hasPackageJson, hasSrcDir };
}

// ── Project component scanner ──────────────────────────────────────────

/**
 * List subdirectories in the project root (one level deep)
 * for the Settings page root-directory dropdown.
 * Always includes "." as the first entry.
 */
export async function listDirectories(): Promise<string[]> {
  const dirs: string[] = ['.'];
  const SKIP = new Set(['.git', '.figma-sync', 'Figma', 'node_modules', 'dist', '.docusaurus', 'build', '.next', '.cache']);

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
    throw new Error('No Figma/config/figma.config.json found. Please configure the project first.');
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

// ── Layer map DB ───────────────────────────────────────────────────────

export async function readLayerMap(): Promise<LayerMapStore> {
  try {
    const raw = await readFile(LAYER_MAP_PATH, 'utf8');
    return JSON.parse(raw) as LayerMapStore;
  } catch {
    return { version: 1, frames: {} };
  }
}

export async function saveLayerMap(
  parentNodeId: string,
  frame: LayerFrame,
): Promise<void> {
  await ensureDbDir();
  const store = await readLayerMap();
  store.frames[parentNodeId] = frame;
  await writeFile(LAYER_MAP_PATH, JSON.stringify(store, null, 2) + '\n', 'utf8');
}

// ── Component source reader ────────────────────────────────────────────

export interface ComponentSource {
  name: string;
  file: string;
  source: string;
}

export interface ReadComponentSourceResult {
  component: ComponentSource;
  subComponents: ComponentSource[];
}

export interface ReadComponentSpecResult {
  name: string;
  file: string;
  exists: boolean;
  content?: string;
}

/**
 * Read a component's source code by name.
 * Resolves the file from connections.json, or falls back to scanning project files.
 * Extracts PascalCase imports and reads one level of sub-component sources.
 */
export async function readComponentSource(
  componentName: string,
): Promise<ReadComponentSourceResult> {
  const config = await readConfig();
  if (!config) {
    throw new Error('No Figma/config/figma.config.json found. Please configure the project first.');
  }

  const rootDir = resolve(PROJECT_ROOT, config.rootDir || '.');

  // Step 1: Find the component file
  let componentFile: string | null = null;
  let fileRelativeToProjectRoot = false;

  // Try connections first
  const connections = await readConnections();
  const conn = connections.connections.find(
    (c) => c.codeComponent === componentName,
  );
  if (conn) {
    componentFile = conn.file;
    fileRelativeToProjectRoot = true; // connections.json paths are relative to PROJECT_ROOT
  }

  // Fall back to project component scan
  if (!componentFile) {
    const components = await listProjectComponents();
    const match = components.find((c) => c.name === componentName);
    if (match) {
      componentFile = match.file;
      fileRelativeToProjectRoot = false; // listProjectComponents paths are relative to rootDir
    }
  }

  if (!componentFile) {
    throw new Error(
      `Component "${componentName}" not found in connections or project files.`,
    );
  }

  // Step 2: Read the main component source
  const fullPath = fileRelativeToProjectRoot
    ? resolve(PROJECT_ROOT, componentFile)
    : resolve(rootDir, componentFile);
  let source: string;
  try {
    source = await readFile(fullPath, 'utf8');
  } catch {
    throw new Error(`Could not read file: ${componentFile}`);
  }

  const component: ComponentSource = {
    name: componentName,
    file: componentFile,
    source,
  };

  // Step 3: Extract PascalCase imports (one level deep)
  const subComponents: ComponentSource[] = [];
  const importRegex =
    /import\s+(?:(?:\{[^}]*\b([A-Z]\w*)\b[^}]*\})|(?:([A-Z]\w*)))\s+from\s+['"](\.[^'"]+)['"]/g;

  let importMatch: RegExpExecArray | null;
  while ((importMatch = importRegex.exec(source)) !== null) {
    const importedName = importMatch[1] || importMatch[2];
    const importPath = importMatch[3];
    if (!importedName || !importPath) continue;

    // Resolve the import relative to the component file
    const componentDir = dirname(fullPath);
    let resolvedImport = resolve(componentDir, importPath);

    // Try common extensions if the import doesn't have one
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    let importFullPath: string | null = null;

    if (existsSync(resolvedImport)) {
      importFullPath = resolvedImport;
    } else {
      for (const ext of extensions) {
        if (existsSync(resolvedImport + ext)) {
          importFullPath = resolvedImport + ext;
          break;
        }
        // Also try index files
        if (existsSync(resolve(resolvedImport, `index${ext}`))) {
          importFullPath = resolve(resolvedImport, `index${ext}`);
          break;
        }
      }
    }

    if (importFullPath) {
      try {
        const subSource = await readFile(importFullPath, 'utf8');
        const relPath = relative(rootDir, importFullPath);
        subComponents.push({
          name: importedName,
          file: relPath,
          source: subSource,
        });
      } catch {
        // Skip unreadable sub-components
      }
    }
  }

  return { component, subComponents };
}

// ── Figma component spec files (.figma.ts) ───────────────────────────

function normalizeSpecName(name: string): string {
  return name
    .trim()
    .replace(/\.figma\.ts$/i, '')
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9_/-]/g, '');
}

async function resolveComponentSpecDir(): Promise<string> {
  const config = await readConfig();
  const specDir = config?.componentSpecDir || DEFAULT_COMPONENT_SPEC_DIR;
  return resolve(PROJECT_ROOT, specDir);
}

async function resolveSpecFilePath(name: string): Promise<{ normalizedName: string; filePath: string; relFile: string }> {
  const normalizedName = normalizeSpecName(name);
  if (!normalizedName) {
    throw new Error('Spec name is required. Example: "Button"');
  }

  const specDir = await resolveComponentSpecDir();
  const filePath = resolve(specDir, `${normalizedName}.figma.ts`);
  const safePrefix = specDir.endsWith('/') ? specDir : `${specDir}/`;

  // Guard against path traversal
  if (!filePath.startsWith(safePrefix) && filePath !== specDir) {
    throw new Error('Invalid spec name/path.');
  }

  const relFile = relative(PROJECT_ROOT, filePath);
  return { normalizedName, filePath, relFile };
}

export async function readComponentSpec(name: string): Promise<ReadComponentSpecResult> {
  const { normalizedName, filePath, relFile } = await resolveSpecFilePath(name);

  if (!existsSync(filePath)) {
    return { name: normalizedName, file: relFile, exists: false };
  }

  const content = await readFile(filePath, 'utf8');
  return { name: normalizedName, file: relFile, exists: true, content };
}

export async function saveComponentSpec(name: string, content: string): Promise<ReadComponentSpecResult> {
  const { normalizedName, filePath, relFile } = await resolveSpecFilePath(name);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

  return { name: normalizedName, file: relFile, exists: true, content };
}

export async function listComponentSpecs(): Promise<string[]> {
  const specDir = await resolveComponentSpecDir();
  if (!existsSync(specDir)) {
    return [];
  }

  const files = await glob('**/*.figma.ts', { cwd: specDir });
  return files.sort();
}

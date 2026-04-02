/**
 * CLI: `init` command
 *
 * Seeds the expected files and folders into the consumer project.
 *
 *   npx gene2-figma-mcp init
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..', '..');
const TEMPLATES_DIR = resolve(PKG_ROOT, 'templates');

// ── Helpers ────────────────────────────────────────────────────────

function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function prompt(question: string, defaultValue = ''): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
      rl.close();
      res(answer.trim() || defaultValue);
    });
  });
}

async function readTemplate(name: string): Promise<string> {
  return readFile(resolve(TEMPLATES_DIR, name), 'utf8');
}

function applyVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function writeIfNotExists(
  filePath: string,
  content: string,
  force: boolean,
): Promise<'created' | 'skipped' | 'overwritten'> {
  const exists = existsSync(filePath);
  if (exists && !force) {
    return 'skipped';
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return exists ? 'overwritten' : 'created';
}

// ── Files to seed ──────────────────────────────────────────────────

interface SeedFile {
  /** Path relative to project root */
  relPath: string;
  /** Template file name in templates/ dir, or null for raw content */
  template: string | null;
  /** Raw content (used when template is null) */
  content?: string;
  /** Source file path relative to package root (for binary/large file copies) */
  copyFrom?: string;
}

const SEED_FILES: SeedFile[] = [
  { relPath: 'figma/config/figma.config.json', template: 'figma.config.json' },
  { relPath: 'figma/app/.figma-sync/connections.json', template: null, content: '{\n  "version": 1,\n  "connections": []\n}\n' },
  { relPath: 'figma/app/.figma-sync/layer-map.json', template: null, content: '{\n  "version": 1,\n  "frames": {}\n}\n' },
  { relPath: '.vscode/mcp.json', template: 'mcp.json.template' },
  { relPath: '.github/copilot-instructions.md', template: 'copilot-instructions.md.template' },
  { relPath: 'figma/components/.gitkeep', template: null, content: '' },
  { relPath: 'figma/tokens/tokens.json', template: null, content: '{\n  "version": 1,\n  "figmaFileKey": "",\n  "lastSyncedAt": "",\n  "collections": {}\n}\n' },
  { relPath: 'figma/tokens/generated/.gitkeep', template: null, content: '' },
  { relPath: 'figma/plugin/manifest.json', template: null, copyFrom: 'figma-plugin/manifest.json' },
  { relPath: 'figma/plugin/code.js', template: null, copyFrom: 'figma-plugin/code.js' },
  { relPath: 'figma/plugin/ui.html', template: null, copyFrom: 'figma-plugin/ui.html' },
  { relPath: '.github/skills/component-spec-layer/SKILL.md', template: null, copyFrom: 'skills/component-spec-layer/SKILL.md' },
  { relPath: '.github/skills/create-ds-component-page/SKILL.md', template: null, copyFrom: 'skills/create-ds-component-page/SKILL.md' },
  { relPath: '.github/skills/design-tokens/SKILL.md', template: null, copyFrom: 'skills/design-tokens/SKILL.md' },
  { relPath: '.github/skills/discover-and-convert/SKILL.md', template: null, copyFrom: 'skills/discover-and-convert/SKILL.md' },
  { relPath: '.github/skills/figma-node-manipulation/SKILL.md', template: null, copyFrom: 'skills/figma-node-manipulation/SKILL.md' },
];

// ── Main ───────────────────────────────────────────────────────────

export async function runInit(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const force = args.includes('--force');
  const version = getVersion();

  console.log('');
  console.log(`  gene2-figma-mcp v${version}`);
  console.log('');

  // Check if already initialized
  const configPath = resolve(projectRoot, 'figma/config/figma.config.json');
  if (existsSync(configPath) && !force) {
    console.log('  ⚠️  Already initialized (figma/config/figma.config.json exists).');
    console.log('  Run with --force to overwrite existing files.');
    console.log('');
    return;
  }

  // Interactive prompts (skip in CI / non-interactive)
  let figmaFileKey = '';
  let rootDir = '.';

  const isInteractive = process.stdin.isTTY;
  if (isInteractive) {
    figmaFileKey = await prompt('Figma file key (optional, can set later)', '');
    rootDir = await prompt('Project root directory', '.');
    console.log('');
  }

  // Template variables
  const vars: Record<string, string> = {
    version,
    figmaFileKey,
    rootDir,
  };

  // Seed files
  let created = 0;
  let skipped = 0;

  for (const file of SEED_FILES) {
    const absPath = resolve(projectRoot, file.relPath);
    let content: string;

    if (file.copyFrom) {
      content = await readFile(resolve(PKG_ROOT, file.copyFrom), 'utf8');
    } else if (file.template) {
      const raw = await readTemplate(file.template);
      content = applyVars(raw, vars);
    } else {
      content = file.content ?? '';
    }

    const result = await writeIfNotExists(absPath, content, force);
    const icon = result === 'skipped' ? '⏭️' : '✓';
    console.log(`  ${icon} ${file.relPath}${result === 'skipped' ? ' (exists, skipped)' : ''}`);

    if (result === 'skipped') skipped++;
    else created++;
  }

  console.log('');
  if (created > 0) {
    console.log(`  ✅ Created ${created} file${created > 1 ? 's' : ''}.${skipped > 0 ? ` ${skipped} skipped (already exist).` : ''}`);
  } else {
    console.log(`  All files already exist. Use --force to overwrite.`);
  }

  console.log('');
  console.log('  Next steps:');
  if (!figmaFileKey) {
    console.log('  1. Open figma/config/figma.config.json and set your Figma file key');
  }
  console.log(`  ${figmaFileKey ? '1' : '2'}. Run: npx gene2-figma-mcp bridge`);
  console.log(`  ${figmaFileKey ? '2' : '3'}. Open the Gene2 Figma MCP plugin in Figma Desktop`);
  console.log(`  ${figmaFileKey ? '3' : '4'}. Start using Copilot in agent mode`);
  console.log('');
}

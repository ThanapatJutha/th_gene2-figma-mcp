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
  /** Group for --only filtering */
  group: 'config' | 'showcase' | 'skills' | 'plugin' | 'tokens' | 'components';
}

const SEED_FILES: SeedFile[] = [
  // ── Config ─────────────────────────────────────────────────────────
  { relPath: 'figma/config/figma.config.json', template: 'figma.config.json', group: 'config' },
  { relPath: 'figma/app/.figma-sync/connections.json', template: null, content: '{\n  "version": 1,\n  "connections": []\n}\n', group: 'config' },
  { relPath: 'figma/app/.figma-sync/layer-map.json', template: null, content: '{\n  "version": 1,\n  "frames": {}\n}\n', group: 'config' },
  { relPath: '.vscode/mcp.json', template: 'mcp.json.template', group: 'config' },
  { relPath: '.github/copilot-instructions.md', template: 'copilot-instructions.md.template', group: 'config' },
  // ── Components ─────────────────────────────────────────────────────
  { relPath: 'figma/components/.gitkeep', template: null, content: '', group: 'components' },
  { relPath: 'src/components/.gitkeep', template: null, content: '', group: 'components' },
  // ── Tokens ─────────────────────────────────────────────────────────
  { relPath: 'figma/tokens/tokens.json', template: null, content: '{\n  "version": 1,\n  "figmaFileKey": "",\n  "lastSyncedAt": "",\n  "collections": {}\n}\n', group: 'tokens' },
  { relPath: 'figma/tokens/generated/.gitkeep', template: null, content: '', group: 'tokens' },
  // ── Plugin ─────────────────────────────────────────────────────────
  { relPath: 'figma/plugin/manifest.json', template: null, copyFrom: 'figma-plugin/manifest.json', group: 'plugin' },
  { relPath: 'figma/plugin/code.js', template: null, copyFrom: 'figma-plugin/code.js', group: 'plugin' },
  { relPath: 'figma/plugin/ui.html', template: null, copyFrom: 'figma-plugin/ui.html', group: 'plugin' },
  // ── Skills ─────────────────────────────────────────────────────────
  { relPath: '.github/skills/component-spec-layer/SKILL.md', template: null, copyFrom: 'skills/component-spec-layer/SKILL.md', group: 'skills' },
  { relPath: '.github/skills/create-ds-component-page/SKILL.md', template: null, copyFrom: 'skills/create-ds-component-page/SKILL.md', group: 'skills' },
  { relPath: '.github/skills/design-tokens/SKILL.md', template: null, copyFrom: 'skills/design-tokens/SKILL.md', group: 'skills' },
  { relPath: '.github/skills/discover-and-convert/SKILL.md', template: null, copyFrom: 'skills/discover-and-convert/SKILL.md', group: 'skills' },
  { relPath: '.github/skills/figma-node-manipulation/SKILL.md', template: null, copyFrom: 'skills/figma-node-manipulation/SKILL.md', group: 'skills' },
  // ── Showcase ───────────────────────────────────────────────────────
  { relPath: 'figma/showcase/package.json', template: null, copyFrom: 'templates/showcase/package.json', group: 'showcase' },
  { relPath: 'figma/showcase/vite.config.ts', template: null, copyFrom: 'templates/showcase/vite.config.ts', group: 'showcase' },
  { relPath: 'figma/showcase/tsconfig.json', template: null, copyFrom: 'templates/showcase/tsconfig.json', group: 'showcase' },
  { relPath: 'figma/showcase/index.html', template: null, copyFrom: 'templates/showcase/index.html', group: 'showcase' },
  { relPath: 'figma/showcase/src/main.tsx', template: null, copyFrom: 'templates/showcase/src/main.tsx', group: 'showcase' },
  { relPath: 'figma/showcase/src/App.tsx', template: null, copyFrom: 'templates/showcase/src/App.tsx', group: 'showcase' },
  { relPath: 'figma/showcase/src/vite-env.d.ts', template: null, copyFrom: 'templates/showcase/src/vite-env.d.ts', group: 'showcase' },
  { relPath: 'figma/showcase/src/components/DSPageTemplate.tsx', template: null, copyFrom: 'templates/showcase/src/components/DSPageTemplate.tsx', group: 'showcase' },
  { relPath: 'figma/showcase/public/.gitkeep', template: null, content: '', group: 'showcase' },
  { relPath: 'figma/showcase/src/pages/.gitkeep', template: null, content: '', group: 'showcase' },
];

// ── Valid groups ───────────────────────────────────────────────────

const VALID_GROUPS = ['config', 'showcase', 'skills', 'plugin', 'tokens', 'components'] as const;

// ── Main ───────────────────────────────────────────────────────────

function printInitHelp(version: string): void {
  console.log(`
  gene2-figma-mcp init v${version}

  Seeds project files for Figma ↔ Code sync.
  Safe to re-run — will prompt before overwriting existing files.

  Usage:
    npx gene2-figma-mcp init [options]

  Options:
    --force              Overwrite all existing files without prompting
    --only <groups>      Seed only specific groups (comma-separated)
    --help, -h           Show this help message

  Groups:
    config               figma.config.json, connections.json, mcp.json, copilot-instructions
    showcase             Vite + React showcase app (DSPageTemplate, App router)
    skills               Copilot skill files (.github/skills/)
    plugin               Figma plugin files (manifest, code, ui)
    tokens               Token sync scaffolding (tokens.json, generated/)
    components           Component spec directory (figma/components/)

  Examples:
    npx gene2-figma-mcp init                        # Full init, prompts on conflict
    npx gene2-figma-mcp init --force                 # Overwrite everything
    npx gene2-figma-mcp init --only showcase         # Seed only showcase files
    npx gene2-figma-mcp init --only showcase,skills  # Seed showcase + skills
    npx gene2-figma-mcp init --only skills --force   # Force-update skills only
`);
}

export async function runInit(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const force = args.includes('--force');
  const version = getVersion();

  if (args.includes('--help') || args.includes('-h')) {
    printInitHelp(version);
    return;
  }

  // Parse --only flag (e.g., --only showcase,skills)
  const onlyIdx = args.indexOf('--only');
  let onlyGroups: Set<string> | null = null;
  if (onlyIdx !== -1 && args[onlyIdx + 1]) {
    const groups = args[onlyIdx + 1].split(',').map((g) => g.trim());
    const invalid = groups.filter((g) => !(VALID_GROUPS as readonly string[]).includes(g));
    if (invalid.length > 0) {
      console.log(`\n  ❌ Unknown group(s): ${invalid.join(', ')}`);
      console.log(`  Valid groups: ${VALID_GROUPS.join(', ')}\n`);
      return;
    }
    onlyGroups = new Set(groups);
  }

  console.log('');
  console.log(`  gene2-figma-mcp v${version}`);
  console.log('');

  const isInteractive = process.stdin.isTTY;

  // Interactive prompts for config group (only on first init or when config group is included)
  let figmaFileKey = '';
  let rootDir = '.';

  const configPath = resolve(projectRoot, 'figma/config/figma.config.json');
  const isFirstInit = !existsSync(configPath);

  if (isInteractive && isFirstInit && (!onlyGroups || onlyGroups.has('config'))) {
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

  // Filter seed files by --only group if specified
  const filesToSeed = onlyGroups
    ? SEED_FILES.filter((f) => onlyGroups!.has(f.group))
    : SEED_FILES;

  if (filesToSeed.length === 0) {
    console.log('  No files to seed for the specified group(s).\n');
    return;
  }

  // Seed files
  let created = 0;
  let skipped = 0;
  let overwritten = 0;
  let overwriteAll = false;
  let skipAll = false;

  for (const file of filesToSeed) {
    const absPath = resolve(projectRoot, file.relPath);
    const fileExists = existsSync(absPath);

    // Handle conflict resolution
    if (fileExists && !force) {
      if (skipAll) {
        console.log(`  ⏭️ ${file.relPath} (exists, skipped)`);
        skipped++;
        continue;
      }

      if (!overwriteAll) {
        if (isInteractive) {
          const answer = await prompt(
            `${file.relPath} exists — overwrite? [y]es / [n]o / [a]ll / [s]kip-all`,
            'n',
          );
          const choice = answer.toLowerCase().charAt(0);
          if (choice === 'a') {
            overwriteAll = true;
          } else if (choice === 's') {
            skipAll = true;
            console.log(`  ⏭️ ${file.relPath} (exists, skipped)`);
            skipped++;
            continue;
          } else if (choice !== 'y') {
            console.log(`  ⏭️ ${file.relPath} (exists, skipped)`);
            skipped++;
            continue;
          }
        } else {
          // Non-interactive: skip existing files
          console.log(`  ⏭️ ${file.relPath} (exists, skipped)`);
          skipped++;
          continue;
        }
      }
    }

    let content: string;

    if (file.copyFrom) {
      content = await readFile(resolve(PKG_ROOT, file.copyFrom), 'utf8');
    } else if (file.template) {
      const raw = await readTemplate(file.template);
      content = applyVars(raw, vars);
    } else {
      content = file.content ?? '';
    }

    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, content, 'utf8');

    if (fileExists) {
      console.log(`  ✓ ${file.relPath} (overwritten)`);
      overwritten++;
    } else {
      console.log(`  ✓ ${file.relPath}`);
      created++;
    }
  }

  console.log('');
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} created`);
  if (overwritten > 0) parts.push(`${overwritten} overwritten`);
  if (skipped > 0) parts.push(`${skipped} skipped`);

  if (parts.length > 0) {
    console.log(`  ✅ ${parts.join(', ')}.`);
  } else {
    console.log(`  Nothing to do.`);
  }

  if (onlyGroups) {
    console.log(`  (filtered by --only ${[...onlyGroups].join(',')})`);
  }

  const showConfigHint = !figmaFileKey && isFirstInit && (!onlyGroups || onlyGroups.has('config'));

  console.log('');
  console.log('  Next steps:');
  if (showConfigHint) {
    console.log('  1. Open figma/config/figma.config.json and set your Figma file key');
  }
  console.log(`  ${showConfigHint ? '2' : '1'}. Run: npx gene2-figma-mcp bridge`);
  console.log(`  ${showConfigHint ? '3' : '2'}. Open the Gene2 Figma MCP plugin in Figma Desktop`);
  console.log(`  ${showConfigHint ? '4' : '3'}. Start using Copilot in agent mode`);
  console.log('');
}

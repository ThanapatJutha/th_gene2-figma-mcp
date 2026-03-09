#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';

import { loadConfig } from './config.js';
import { createFigmaClient } from './figma.js';
import { writeJson } from './fs_utils.js';
import { flattenNodes, printNodeTree } from './nodes.js';
import { readMap, writeMap, createEmptyMap, upsertComponent } from './map.js';
import type { FigmaFileResponse, ComponentMapping } from './types.js';

const program = new Command();
program
  .name('figma-sync')
  .description('Sync Figma file metadata/assets to disk')
  .version('0.1.0');

program
  .command('file')
  .description('Fetch a Figma file JSON and write to disk')
  .option('-k, --file-key <key>', 'Figma file key (overrides FIGMA_FILE_KEY)')
  .option('-o, --out <path>', 'Output JSON path', 'out/figma-file.json')
  .action(async (opts) => {
    const config = loadConfig({ figmaFileKey: opts.fileKey });
    const fileKey = config.figmaFileKey;
    if (!fileKey) throw new Error('Missing FIGMA_FILE_KEY (or pass --file-key).');

    const figma = createFigmaClient(config.figmaToken);
    const json = await figma.getFile(fileKey);

    const outPath = resolve(opts.out);
    await writeJson(outPath, json);
    console.log(`Wrote ${outPath}`);
  });

program
  .command('images')
  .description('Get export image URLs for one or more node IDs')
  .requiredOption('-i, --ids <ids>', 'Comma-separated node IDs, e.g. "1:2,3:4"')
  .option('-k, --file-key <key>', 'Figma file key (overrides FIGMA_FILE_KEY)')
  .option('-f, --format <format>', 'png|svg|pdf', 'png')
  .option('-o, --out <path>', 'Output JSON path', 'out/figma-images.json')
  .action(async (opts) => {
    const config = loadConfig({ figmaFileKey: opts.fileKey });
    const fileKey = config.figmaFileKey;
    if (!fileKey) throw new Error('Missing FIGMA_FILE_KEY (or pass --file-key).');

    const ids = String(opts.ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) throw new Error('No node IDs provided.');

    const figma = createFigmaClient(config.figmaToken);
    const json = await figma.getImageUrls(fileKey, ids, opts.format);

    const outPath = resolve(opts.out);
    await writeJson(outPath, json);
    console.log(`Wrote ${outPath}`);
  });

// ─── nodes: explore the Figma file tree ────────────────────────────────────

program
  .command('nodes')
  .description('Fetch Figma file and print the node tree (useful for finding node IDs)')
  .option('-k, --file-key <key>', 'Figma file key (overrides FIGMA_FILE_KEY)')
  .option('-d, --depth <n>', 'Max tree depth', '4')
  .option('-t, --types <types>', 'Filter by node types (comma-separated, e.g. FRAME,TEXT)')
  .option('-o, --out <path>', 'Also save full file JSON to this path')
  .action(async (opts) => {
    const config = loadConfig({ figmaFileKey: opts.fileKey });
    const fileKey = config.figmaFileKey;
    if (!fileKey) throw new Error('Missing FIGMA_FILE_KEY (or pass --file-key).');

    console.log(`Fetching file ${fileKey}…`);
    const figma = createFigmaClient(config.figmaToken);
    const json = (await figma.getFile(fileKey)) as FigmaFileResponse;

    if (opts.out) {
      const outPath = resolve(opts.out);
      await writeJson(outPath, json);
      console.log(`Wrote full JSON → ${outPath}\n`);
    }

    const types = opts.types
      ? String(opts.types).split(',').map((s: string) => s.trim())
      : undefined;

    const flat = flattenNodes(json.document, {
      maxDepth: Number(opts.depth),
      types,
    });

    console.log(`\nFile: "${json.name}" (${json.document.children?.length ?? 0} pages)\n`);
    printNodeTree(flat);
    console.log(`\n${flat.length} nodes shown.`);
  });

// ─── map: manage component mappings ────────────────────────────────────────

const mapCmd = program
  .command('map')
  .description('Manage Figma ↔ code component mappings (figma-sync.map.json)');

mapCmd
  .command('init')
  .description('Create a new figma-sync.map.json with the given file key')
  .requiredOption('-k, --file-key <key>', 'Figma file key')
  .option('-o, --out <path>', 'Map file path', 'figma-sync.map.json')
  .action(async (opts) => {
    const map = createEmptyMap(opts.fileKey);
    const filePath = await writeMap(map, opts.out);
    console.log(`Created ${filePath}`);
  });

mapCmd
  .command('add')
  .description('Add a component mapping')
  .requiredOption('-n, --name <name>', 'Component name (e.g. HeaderCard)')
  .requiredOption('-f, --file <path>', 'Component file path relative to repo root')
  .requiredOption('-i, --node-id <id>', 'Figma node ID (e.g. "1:23")')
  .option('-k, --file-key <key>', 'Figma file key (uses map default if omitted)')
  .option('-s, --selector <css>', 'CSS selector for push sync')
  .option('--map <path>', 'Map file path', 'figma-sync.map.json')
  .action(async (opts) => {
    const map = await readMap(opts.map);
    if (!map) throw new Error(`No map file found at ${opts.map}. Run "figma-sync map init" first.`);

    const component: ComponentMapping = {
      name: opts.name,
      file: opts.file,
      figmaNodeId: opts.nodeId,
      figmaFileKey: opts.fileKey ?? map.figmaFileKey,
    };
    if (opts.selector) component.selector = opts.selector;

    upsertComponent(map, component);
    const filePath = await writeMap(map, opts.map);
    console.log(`Added mapping: ${component.name} → ${component.figmaNodeId}`);
    console.log(`Updated ${filePath}`);
  });

mapCmd
  .command('list')
  .description('List all component mappings')
  .option('--map <path>', 'Map file path', 'figma-sync.map.json')
  .action(async (opts) => {
    const map = await readMap(opts.map);
    if (!map) throw new Error(`No map file found at ${opts.map}. Run "figma-sync map init" first.`);

    console.log(`Figma file: ${map.figmaFileKey}`);
    console.log(`Components (${map.components.length}):\n`);

    if (map.components.length === 0) {
      console.log('  (none — use "figma-sync map add" to add mappings)');
      return;
    }

    for (const c of map.components) {
      console.log(`  ${c.name}`);
      console.log(`    File:     ${c.file}`);
      console.log(`    Node ID:  ${c.figmaNodeId}`);
      console.log(`    File Key: ${c.figmaFileKey}`);
      if (c.selector) console.log(`    Selector: ${c.selector}`);
      console.log();
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});

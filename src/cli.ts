#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';

import { loadConfig } from './config.js';
import { createFigmaClient } from './figma.js';
import { writeJson } from './fs_utils.js';

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

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});

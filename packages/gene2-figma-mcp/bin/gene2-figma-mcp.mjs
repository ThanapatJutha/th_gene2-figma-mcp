#!/usr/bin/env node

/**
 * gene2-figma-mcp CLI
 *
 * Subcommands:
 *   init     Seed project files for Figma ↔ Code sync
 *   bridge   Start the WebSocket bridge server
 *   mcp      Start the MCP server (stdio, for VS Code)
 *   doctor   Diagnose setup issues
 *   --version  Print version
 *   --help     Print usage
 *
 * Note: This entry point re-spawns itself under tsx so that TypeScript
 * source files can be imported directly. If tsx is not found, it falls
 * back to the compiled JS dist (future).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Bootstrap: re-exec under tsx if needed ─────────────────────────

// If tsx loader is not already active, re-spawn under tsx
if (!process.env.__GENE2_TSX_ACTIVE) {
  // Try multiple locations where tsx might live
  const candidates = [
    resolve(__dirname, '..', 'node_modules', '.bin', 'tsx'),            // local package
    resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'tsx'), // monorepo root
  ];

  let tsxBin = null;
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      tsxBin = candidate;
      break;
    } catch {
      // try next
    }
  }

  // Fallback: try tsx from PATH
  if (!tsxBin) {
    try {
      execFileSync('tsx', ['--version'], { stdio: 'ignore' });
      tsxBin = 'tsx';
    } catch {
      // not found
    }
  }

  if (!tsxBin) {
    console.error('⚠️  tsx not found. Install it: npm i -D tsx');
    process.exit(1);
  }

  try {
    execFileSync(tsxBin, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, __GENE2_TSX_ACTIVE: '1' },
    });
    process.exit(0);
  } catch (err) {
    // If tsx spawn failed with a non-zero exit, propagate the code
    if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
      process.exit(err.status);
    }
    process.exit(1);
  }
}

// ── Main (running under tsx) ───────────────────────────────────────

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printUsage() {
  const version = getVersion();
  console.log(`
  gene2-figma-mcp v${version}

  Usage:
    npx gene2-figma-mcp <command> [options]

  Commands:
    init       Seed project files for Figma ↔ Code sync
    bridge     Start the WebSocket bridge server (port 9001)
    mcp        Start the MCP server (stdio transport, for VS Code)
    tokens     Sync design tokens (pull / generate / push / sync)
    doctor     Diagnose setup issues

  Options:
    --version  Print version
    --help     Print this help message

  Examples:
    npx gene2-figma-mcp init
    npx gene2-figma-mcp init --force
    npx gene2-figma-mcp bridge
    npx gene2-figma-mcp tokens sync
    npx gene2-figma-mcp doctor
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    process.exit(0);
  }

  const subArgs = args.slice(1);

  switch (command) {
    case 'init': {
      const { runInit } = await import('../src/cli/init.ts');
      await runInit(subArgs);
      break;
    }
    case 'bridge': {
      const { runBridge } = await import('../src/cli/bridge.ts');
      await runBridge(subArgs);
      break;
    }
    case 'mcp': {
      const { runMcp } = await import('../src/cli/mcp.ts');
      await runMcp(subArgs);
      break;
    }
    case 'doctor': {
      const { runDoctor } = await import('../src/cli/doctor.ts');
      await runDoctor(subArgs);
      break;
    }
    case 'tokens': {
      const { runTokens } = await import('../src/cli/tokens.ts');
      await runTokens(subArgs);
      break;
    }
    default:
      console.error(`  Unknown command: ${command}`);
      console.error(`  Run "npx gene2-figma-mcp --help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message ?? err);
  process.exit(1);
});

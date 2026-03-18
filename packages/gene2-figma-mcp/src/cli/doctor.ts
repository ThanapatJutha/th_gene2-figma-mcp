/**
 * CLI: `doctor` command
 *
 * Diagnoses setup issues: config files, bridge connectivity, plugin status.
 *
 *   npx gene2-figma-mcp doctor
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface Check {
  label: string;
  run: () => Promise<'ok' | 'warn' | 'fail'>;
  detail?: string;
}

async function checkBridgeConnectivity(): Promise<'ok' | 'warn' | 'fail'> {
  return new Promise((res) => {
    try {
      // Dynamic import to avoid requiring ws at module level
      import('ws').then(({ default: WebSocket }) => {
        const ws = new WebSocket('ws://127.0.0.1:9001');
        const timeout = setTimeout(() => {
          ws.close();
          res('fail');
        }, 3000);

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'ping' }));
        });

        ws.on('message', (data: Buffer) => {
          clearTimeout(timeout);
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'pong' || msg.status === 'ok') {
              ws.close();
              res('ok');
            } else {
              ws.close();
              res('warn');
            }
          } catch {
            ws.close();
            res('warn');
          }
        });

        ws.on('error', () => {
          clearTimeout(timeout);
          res('fail');
        });
      }).catch(() => {
        res('fail');
      });
    } catch {
      res('fail');
    }
  });
}

export async function runDoctor(_args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const pkgVersion = getPackageVersion();

  console.log('');
  console.log(`  🩺 gene2-figma-mcp doctor (v${pkgVersion})`);
  console.log('  ─────────────────────────────────────');
  console.log('');

  const checks: Check[] = [
    // ── Node version ──
    {
      label: 'Node.js >= 20',
      run: async () => {
        const major = parseInt(process.versions.node.split('.')[0], 10);
        return major >= 20 ? 'ok' : 'fail';
      },
    },
    // ── Config files ──
    {
      label: 'figma/config/figma.config.json exists',
      run: async () => {
        const p = resolve(projectRoot, 'figma/config/figma.config.json');
        if (!existsSync(p)) return 'fail';
        try {
          JSON.parse(readFileSync(p, 'utf8'));
          return 'ok';
        } catch {
          return 'fail';
        }
      },
    },
    {
      label: 'Figma file key is configured',
      run: async () => {
        const p = resolve(projectRoot, 'figma/config/figma.config.json');
        if (!existsSync(p)) return 'fail';
        try {
          const cfg = JSON.parse(readFileSync(p, 'utf8'));
          return cfg.figmaFileKey ? 'ok' : 'warn';
        } catch {
          return 'fail';
        }
      },
    },
    // ── Version staleness ──
    {
      label: `Config version matches toolkit (v${pkgVersion})`,
      run: async () => {
        const p = resolve(projectRoot, 'figma/config/figma.config.json');
        if (!existsSync(p)) return 'warn';
        try {
          const cfg = JSON.parse(readFileSync(p, 'utf8'));
          const seededVersion = cfg._gene2Version;
          if (!seededVersion) return 'warn';
          return seededVersion === pkgVersion ? 'ok' : 'warn';
        } catch {
          return 'warn';
        }
      },
    },
    // ── MCP config ──
    {
      label: '.vscode/mcp.json exists',
      run: async () => {
        const p = resolve(projectRoot, '.vscode/mcp.json');
        return existsSync(p) ? 'ok' : 'fail';
      },
    },
    {
      label: '.vscode/mcp.json has no absolute paths',
      run: async () => {
        const p = resolve(projectRoot, '.vscode/mcp.json');
        if (!existsSync(p)) return 'warn';
        try {
          const content = readFileSync(p, 'utf8');
          // Check for absolute paths like /Users/... or C:\...
          if (/\/Users\/|\/home\/|[A-Z]:\\/.test(content)) return 'fail';
          return 'ok';
        } catch {
          return 'warn';
        }
      },
    },
    // ── Copilot instructions ──
    {
      label: '.github/copilot-instructions.md exists',
      run: async () => {
        const p = resolve(projectRoot, '.github/copilot-instructions.md');
        return existsSync(p) ? 'ok' : 'warn';
      },
    },
    // ── Data files ──
    {
      label: 'connections.json exists',
      run: async () => {
        const p = resolve(projectRoot, 'figma/app/.figma-sync/connections.json');
        return existsSync(p) ? 'ok' : 'warn';
      },
    },
    {
      label: 'figma/components/ directory exists',
      run: async () => {
        const p = resolve(projectRoot, 'figma/components');
        return existsSync(p) ? 'ok' : 'warn';
      },
    },
    // ── Bridge connectivity ──
    {
      label: 'Bridge server reachable (ws://127.0.0.1:9001)',
      run: checkBridgeConnectivity,
    },
  ];

  let hasIssues = false;
  for (const check of checks) {
    const result = await check.run();
    const icon = result === 'ok' ? '✅' : result === 'warn' ? '⚠️' : '❌';
    const hint =
      result === 'fail'
        ? check.label.includes('Bridge')
          ? ' — run `npx gene2-figma-mcp bridge` to start'
          : check.label.includes('Node')
            ? ` — found v${process.versions.node}, need >= 20`
            : check.label.includes('absolute')
              ? ' — regenerate with `npx gene2-figma-mcp init --force`'
              : ' — run `npx gene2-figma-mcp init` to fix'
        : result === 'warn'
          ? check.label.includes('version matches')
            ? ' — run `npx gene2-figma-mcp init --force` to update'
            : ' — optional but recommended'
          : '';
    console.log(`  ${icon} ${check.label}${hint}`);
    if (result !== 'ok') hasIssues = true;
  }

  console.log('');
  if (hasIssues) {
    console.log('  Some checks need attention. See hints above.');
  } else {
    console.log('  ✅ All checks passed! Your setup looks good.');
  }
  console.log('');
}

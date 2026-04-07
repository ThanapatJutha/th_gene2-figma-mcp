/**
 * CLI: `tokens` command
 *
 * Sync design tokens between Figma variables and the local project.
 *
 *   npx gene2-figma-mcp tokens pull      — Figma → tokens.json
 *   npx gene2-figma-mcp tokens generate  — tokens.json → CSS + TS
 *   npx gene2-figma-mcp tokens push      — tokens.json → Figma variables
 *   npx gene2-figma-mcp tokens sync      — pull + generate
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { sendCommand } from '../bridge/bridge-client.js';
import type { BridgeRequest, BridgeResponse } from '../bridge/protocol.js';

// ── Types ──────────────────────────────────────────────────────────────

interface TokenValue {
  type: 'COLOR' | 'FLOAT' | 'STRING';
  values: Record<string, string | number>;
}

interface TokenCollection {
  modes: string[];
  variables: Record<string, TokenValue>;
}

interface TextStyle {
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number | string;
  letterSpacing: number | string;
  textDecoration: string;
  textCase: string;
}

interface TokensFile {
  version: number;
  figmaFileKey: string;
  lastSyncedAt: string;
  collections: Record<string, TokenCollection>;
  textStyles?: Record<string, TextStyle>;
}

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
  valuesByMode: Record<string, unknown>;
  collectionName: string;
  collectionId: string;
}

// ── Paths ──────────────────────────────────────────────────────────────

const TOKENS_PATH = resolve(process.cwd(), 'figma/tokens/tokens.json');
const CSS_OUTPUT_DIR = resolve(process.cwd(), 'src/tokens');

// ── Helpers ────────────────────────────────────────────────────────────

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) return `${hex}${toHex(a)}`;
  return hex;
}

function tokenNameToCssVar(collectionName: string, tokenName: string): string {
  // "01 Color - Primitive Token" + "neutral/000" → --color-primitive-neutral-000
  const prefix = collectionName
    .replace(/^\d+\s+/, '') // strip leading number
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const name = tokenName
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `--${prefix}-${name}`;
}

function tokenNameToTsKey(collectionName: string, tokenName: string): string {
  // "01 Color - Primitive Token" + "neutral/000" → colorPrimitiveNeutral000
  const raw = tokenNameToCssVar(collectionName, tokenName)
    .replace(/^--/, '')
    .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  return raw;
}

// ── Typography helpers ─────────────────────────────────────────────────

/** Detect if a collection is typography-related */
function isTypographyCollection(collectionName: string): boolean {
  return /typo/i.test(collectionName);
}

/** Detect token category from its variable name */
function getTypoCategory(varName: string): 'size' | 'line-height' | 'weight' | 'family' | null {
  const lower = varName.toLowerCase();
  if (lower.startsWith('size/')) return 'size';
  if (lower.startsWith('line height/') || lower.startsWith('line-height/')) return 'line-height';
  if (lower.startsWith('weight/')) return 'weight';
  if (lower.startsWith('family/')) return 'family';
  return null;
}

/** Detect token category for typography primitive tokens (no prefix, just a font name string) */
function getTypoPrimitiveCategory(resolvedType: string): 'family' | null {
  // Primitive typo collections typically contain bare font-family strings
  return resolvedType === 'STRING' ? 'family' : null;
}

/** Map font-weight string to numeric CSS value */
const WEIGHT_MAP: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

function fontWeightToNumber(weight: string): number {
  const key = weight.toLowerCase().replace(/[\s-_]/g, '');
  return WEIGHT_MAP[key] ?? 400;
}

/** Format a typography token value for CSS */
function formatTypoCssValue(
  category: 'size' | 'line-height' | 'weight' | 'family',
  value: string | number,
): string {
  switch (category) {
    case 'size':
    case 'line-height':
      return `${value}px`;
    case 'weight':
      return String(fontWeightToNumber(String(value)));
    case 'family':
      return `"${value}"`;
  }
}

async function makeRequest(
  command: BridgeRequest['command'],
  payload: Record<string, unknown> = {},
): Promise<BridgeResponse> {
  return sendCommand({
    id: randomUUID(),
    type: 'request',
    command,
    payload,
  });
}

async function readTokensFile(): Promise<TokensFile | null> {
  if (!existsSync(TOKENS_PATH)) return null;
  const raw = await readFile(TOKENS_PATH, 'utf8');
  return JSON.parse(raw) as TokensFile;
}

async function writeTokensFile(data: TokensFile): Promise<void> {
  await mkdir(dirname(TOKENS_PATH), { recursive: true });
  await writeFile(TOKENS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function readConfigFileKey(): Promise<string> {
  const configPath = resolve(process.cwd(), 'figma/config/figma.config.json');
  if (!existsSync(configPath)) return '';
  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  return config.figmaFileKey ?? '';
}

// ── Pull: Figma → tokens.json ──────────────────────────────────────────

async function pullTokens(): Promise<void> {
  console.log('');
  console.log('  📥 Pulling design tokens from Figma...');
  console.log('');

  const res = await makeRequest('read-variables');
  if (!res.success) {
    console.error(`  ❌ Failed to read variables: ${res.error}`);
    process.exit(1);
  }

  const variables = res.data as FigmaVariable[];
  if (!variables || variables.length === 0) {
    console.log('  ⚠️  No variables found in the Figma file.');
    console.log('  Create design tokens in Figma first, then run this command again.');
    console.log('');
    return;
  }

  // Group by collection — track mode IDs per collection
  const collectionsMap = new Map<
    string,
    { modeIds: Set<string>; vars: FigmaVariable[] }
  >();

  for (const v of variables) {
    let col = collectionsMap.get(v.collectionName);
    if (!col) {
      col = { modeIds: new Set(), vars: [] };
      collectionsMap.set(v.collectionName, col);
    }
    col.vars.push(v);
    for (const modeId of Object.keys(v.valuesByMode)) {
      col.modeIds.add(modeId);
    }
  }

  // Build tokens file
  const fileKey = await readConfigFileKey();
  const tokensFile: TokensFile = {
    version: 1,
    figmaFileKey: fileKey,
    lastSyncedAt: new Date().toISOString(),
    collections: {},
  };

  for (const [colName, col] of collectionsMap) {
    const modeNames = Array.from(col.modeIds).map(
      (id, i) => (col.modeIds.size === 1 ? 'default' : `mode-${i + 1}`),
    );
    const modeIdToName = new Map<string, string>();
    Array.from(col.modeIds).forEach((id, i) => modeIdToName.set(id, modeNames[i]));

    const collection: TokenCollection = {
      modes: modeNames,
      variables: {},
    };

    for (const v of col.vars) {
      const values: Record<string, string | number> = {};

      for (const [modeId, rawValue] of Object.entries(v.valuesByMode)) {
        const modeName = modeIdToName.get(modeId) ?? modeId;

        if (v.resolvedType === 'COLOR' && typeof rawValue === 'object' && rawValue !== null) {
          const obj = rawValue as Record<string, unknown>;
          if ('r' in obj && 'g' in obj && 'b' in obj) {
            const c = obj as { r: number; g: number; b: number; a: number };
            values[modeName] = rgbaToHex(c.r, c.g, c.b, c.a ?? 1);
          } else if ('type' in obj) {
            // Alias reference
            values[modeName] = obj.id ? `alias:${obj.id}` : `alias:unknown`;
          } else {
            values[modeName] = JSON.stringify(rawValue);
          }
        } else if (v.resolvedType === 'FLOAT' && typeof rawValue === 'number') {
          values[modeName] = rawValue;
        } else if (v.resolvedType === 'STRING' && typeof rawValue === 'string') {
          values[modeName] = rawValue;
        } else if (typeof rawValue === 'object' && rawValue !== null && 'type' in (rawValue as Record<string, unknown>)) {
          // Alias reference (e.g., VARIABLE_ALIAS) — store as alias marker
          const alias = rawValue as { type: string; id?: string };
          values[modeName] = alias.id ? `alias:${alias.id}` : `alias:unknown`;
        } else {
          // Fallback — store as-is
          values[modeName] = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
        }
      }

      collection.variables[v.name] = {
        type: v.resolvedType,
        values,
      };
    }

    tokensFile.collections[colName] = collection;
  }

  // ── Resolve alias references ──────────────────────────────────────
  // Build a map: variableId → { collectionName, varName } for lookup
  const varIdMap = new Map<string, { collectionName: string; varName: string }>();
  for (const v of variables) {
    varIdMap.set(v.id, { collectionName: v.collectionName, varName: v.name });
  }

  // Resolve aliases by following the chain to concrete values
  const resolveAlias = (aliasValue: string, visited = new Set<string>()): string | number | null => {
    if (!aliasValue.startsWith('alias:')) return null;
    const refId = aliasValue.slice('alias:'.length);
    if (visited.has(refId)) return null; // circular reference guard
    visited.add(refId);

    const ref = varIdMap.get(refId);
    if (!ref) return null;

    const refCollection = tokensFile.collections[ref.collectionName];
    if (!refCollection) return null;

    const refToken = refCollection.variables[ref.varName];
    if (!refToken) return null;

    // Use first mode value
    const refValue = refToken.values[refCollection.modes[0]];
    if (typeof refValue === 'string' && refValue.startsWith('alias:')) {
      return resolveAlias(refValue, visited);
    }
    return refValue ?? null;
  };

  // Walk all tokens and resolve aliases
  let aliasesResolved = 0;
  for (const col of Object.values(tokensFile.collections)) {
    for (const token of Object.values(col.variables)) {
      for (const [mode, value] of Object.entries(token.values)) {
        if (typeof value === 'string' && value.startsWith('alias:')) {
          const resolved = resolveAlias(value);
          if (resolved !== null) {
            token.values[mode] = resolved;
            aliasesResolved++;
          }
        }
      }
    }
  }

  // ── Pull text styles ──────────────────────────────────────────────
  const textStylesRes = await makeRequest('read-text-styles');
  if (textStylesRes.success && Array.isArray(textStylesRes.data) && textStylesRes.data.length > 0) {
    const styles = textStylesRes.data as Array<{
      name: string;
      fontFamily: string;
      fontStyle: string;
      fontSize: number;
      fontWeight: string;
      lineHeight: number | string;
      letterSpacing: number | string;
      textDecoration: string;
      textCase: string;
    }>;
    tokensFile.textStyles = {};
    for (const s of styles) {
      tokensFile.textStyles[s.name] = {
        fontFamily: s.fontFamily,
        fontStyle: s.fontStyle,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        textDecoration: s.textDecoration,
        textCase: s.textCase,
      };
    }
  }

  await writeTokensFile(tokensFile);

  // Summary
  let totalVars = 0;
  for (const col of Object.values(tokensFile.collections)) {
    totalVars += Object.keys(col.variables).length;
  }

  console.log(`  ✅ Pulled ${totalVars} variables from ${Object.keys(tokensFile.collections).length} collections`);
  if (aliasesResolved > 0) {
    console.log(`  🔗 Resolved ${aliasesResolved} alias references to concrete values`);
  }
  for (const [name, col] of Object.entries(tokensFile.collections)) {
    console.log(`     ${name}: ${Object.keys(col.variables).length} vars (${col.modes.join(', ')})`);
  }
  if (tokensFile.textStyles && Object.keys(tokensFile.textStyles).length > 0) {
    console.log(`  🔤 Pulled ${Object.keys(tokensFile.textStyles).length} text styles`);
  }
  console.log('');
  console.log(`  📄 Saved to figma/tokens/tokens.json`);
  console.log('');
}

// ── Generate: tokens.json → CSS + TS ──────────────────────────────────

async function generateTokens(): Promise<void> {
  console.log('');
  console.log('  ⚙️  Generating theme files from tokens.json...');
  console.log('');

  const tokens = await readTokensFile();
  if (!tokens) {
    console.error('  ❌ No figma/tokens/tokens.json found. Run `tokens pull` first.');
    process.exit(1);
  }

  await mkdir(CSS_OUTPUT_DIR, { recursive: true });

  // ── Generate CSS custom properties ──────────────────────────────────
  const cssLines: string[] = [
    '/* Auto-generated by gene2-figma-mcp — DO NOT EDIT */',
    `/* Synced from Figma: ${tokens.figmaFileKey} */`,
    `/* Generated: ${new Date().toISOString()} */`,
    '',
    ':root {',
  ];

  const tsLines: string[] = [
    '// Auto-generated by gene2-figma-mcp — DO NOT EDIT',
    `// Synced from Figma: ${tokens.figmaFileKey}`,
    `// Generated: ${new Date().toISOString()}`,
    '',
  ];

  for (const [colName, col] of Object.entries(tokens.collections)) {
    cssLines.push(`  /* ${colName} */`);
    tsLines.push(`// ${colName}`);

    // Use first mode as the :root default
    const defaultMode = col.modes[0];

    for (const [varName, token] of Object.entries(col.variables)) {
      const cssVar = tokenNameToCssVar(colName, varName);
      const tsKey = tokenNameToTsKey(colName, varName);
      const value = token.values[defaultMode];

      // Skip alias references in CSS/TS generation
      if (typeof value === 'string' && value.startsWith('alias:')) {
        cssLines.push(`  /* ${cssVar}: alias reference (skipped) */`);
        continue;
      }

      // Detect typography tokens and format appropriately
      const isTypo = isTypographyCollection(colName);
      const typoCategory = isTypo
        ? (getTypoCategory(varName) ?? getTypoPrimitiveCategory(token.type))
        : null;

      if (typoCategory) {
        const formatted = formatTypoCssValue(typoCategory, value);
        cssLines.push(`  ${cssVar}: ${formatted};`);
        tsLines.push(`export const ${tsKey} = 'var(${cssVar})';`);
        if (typoCategory === 'size' || typoCategory === 'line-height') {
          tsLines.push(`export const ${tsKey}Value = ${value};`);
        } else if (typoCategory === 'weight') {
          tsLines.push(`export const ${tsKey}Value = ${fontWeightToNumber(String(value))};`);
        }
      } else if (token.type === 'COLOR') {
        cssLines.push(`  ${cssVar}: ${value};`);
        tsLines.push(`export const ${tsKey} = 'var(${cssVar})';`);
      } else if (token.type === 'FLOAT') {
        cssLines.push(`  ${cssVar}: ${value};`);
        tsLines.push(`export const ${tsKey} = 'var(${cssVar})';`);
        tsLines.push(`export const ${tsKey}Value = ${value};`);
      } else if (token.type === 'STRING') {
        cssLines.push(`  ${cssVar}: ${value};`);
        tsLines.push(`export const ${tsKey} = 'var(${cssVar})';`);
      }
    }

    cssLines.push('');
    tsLines.push('');
  }

  cssLines.push('}');

  // If there are multi-mode collections, generate mode classes
  for (const [colName, col] of Object.entries(tokens.collections)) {
    if (col.modes.length <= 1) continue;

    for (let i = 1; i < col.modes.length; i++) {
      const modeName = col.modes[i];
      cssLines.push('');
      cssLines.push(`/* ${colName} — ${modeName} */`);
      cssLines.push(`.theme-${modeName} {`);

      for (const [varName, token] of Object.entries(col.variables)) {
        const cssVar = tokenNameToCssVar(colName, varName);
        const value = token.values[modeName];
        if (typeof value === 'string' && value.startsWith('alias:')) continue;
        if (value !== undefined && value !== token.values[col.modes[0]]) {
          // Apply typography formatting if applicable
          const isTypo = isTypographyCollection(colName);
          const typoCategory = isTypo
            ? (getTypoCategory(varName) ?? getTypoPrimitiveCategory(token.type))
            : null;
          if (typoCategory) {
            cssLines.push(`  ${cssVar}: ${formatTypoCssValue(typoCategory, value)};`);
          } else {
            cssLines.push(`  ${cssVar}: ${value};`);
          }
        }
      }

      cssLines.push('}');
    }
  }

  // Write files
  const cssPath = resolve(CSS_OUTPUT_DIR, 'tokens.css');
  const tsPath = resolve(CSS_OUTPUT_DIR, 'tokens.ts');

  await writeFile(cssPath, cssLines.join('\n') + '\n', 'utf8');
  await writeFile(tsPath, tsLines.join('\n') + '\n', 'utf8');

  console.log(`  ✅ Generated:`);
  console.log(`     src/tokens/tokens.css`);
  console.log(`     src/tokens/tokens.ts`);
  console.log('');
  console.log(`  💡 Import in your app:`);
  console.log(`     import './tokens/tokens.css';`);
  console.log('');
}

// ── Push: tokens.json → Figma ──────────────────────────────────────────

async function pushTokens(): Promise<void> {
  console.log('');
  console.log('  📤 Pushing tokens to Figma...');
  console.log('');

  const tokens = await readTokensFile();
  if (!tokens) {
    console.error('  ❌ No figma/tokens/tokens.json found. Run `tokens pull` first or create manually.');
    process.exit(1);
  }

  // Read existing variables to diff
  const res = await makeRequest('read-variables');
  const existingVars = (res.success ? (res.data as FigmaVariable[]) : []) ?? [];
  const existingNames = new Set(existingVars.map((v) => `${v.collectionName}/${v.name}`));

  let created = 0;
  let skipped = 0;

  for (const [colName, col] of Object.entries(tokens.collections)) {
    for (const [varName, token] of Object.entries(col.variables)) {
      const fullName = `${colName}/${varName}`;

      if (existingNames.has(fullName)) {
        skipped++;
        continue;
      }

      // Get default mode value
      const defaultMode = col.modes[0];
      const value = token.values[defaultMode];

      if (token.type === 'COLOR' && typeof value === 'string') {
        // Convert hex to RGBA
        const hex = value.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

        const createRes = await makeRequest('create-variable', {
          collectionName: colName,
          name: varName,
          resolvedType: 'COLOR',
          value: { r, g, b, a },
        });

        if (createRes.success) {
          created++;
          console.log(`  ✓ ${fullName}`);
        } else {
          console.log(`  ✗ ${fullName}: ${createRes.error}`);
        }
      } else if (token.type === 'FLOAT' && typeof value === 'number') {
        const createRes = await makeRequest('create-variable', {
          collectionName: colName,
          name: varName,
          resolvedType: 'FLOAT',
          value,
        });
        if (createRes.success) created++;
      } else if (token.type === 'STRING' && typeof value === 'string') {
        const createRes = await makeRequest('create-variable', {
          collectionName: colName,
          name: varName,
          resolvedType: 'STRING',
          value,
        });
        if (createRes.success) created++;
      }
    }
  }

  console.log('');
  console.log(`  ✅ Push complete: ${created} created, ${skipped} already exist`);
  console.log('');
}

// ── Main ───────────────────────────────────────────────────────────────

export async function runTokens(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'pull':
      await pullTokens();
      break;
    case 'generate':
      await generateTokens();
      break;
    case 'push':
      await pushTokens();
      break;
    case 'sync':
      await pullTokens();
      await generateTokens();
      break;
    default:
      console.log(`
  gene2-figma-mcp tokens

  Usage:
    npx gene2-figma-mcp tokens <subcommand>

  Subcommands:
    pull       Read Figma variables → figma/tokens/tokens.json
    generate   Convert tokens.json → CSS + TypeScript
    push       Write tokens.json → Figma variables
    sync       Pull + generate in one step

  Examples:
    npx gene2-figma-mcp tokens pull
    npx gene2-figma-mcp tokens sync
    npx gene2-figma-mcp tokens generate
`);
      if (subcommand) {
        console.error(`  Unknown subcommand: ${subcommand}`);
        process.exit(1);
      }
      break;
  }
}

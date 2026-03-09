import 'dotenv/config';

export type AppConfig = {
  figmaToken: string;
  figmaFileKey?: string;
  outputDir: string;
};

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  const figmaToken = overrides?.figmaToken ?? process.env.FIGMA_TOKEN ?? '';
  const figmaFileKey = overrides?.figmaFileKey ?? process.env.FIGMA_FILE_KEY;
  const outputDir = overrides?.outputDir ?? process.env.OUTPUT_DIR ?? 'out';

  if (!figmaToken) {
    throw new Error(
      'Missing FIGMA_TOKEN. Add it to .env (see .env.example) or set env var FIGMA_TOKEN.'
    );
  }

  return { figmaToken, figmaFileKey, outputDir };
}

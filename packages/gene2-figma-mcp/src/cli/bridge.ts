/**
 * CLI: `bridge` command
 *
 * Starts the WebSocket bridge server.
 *
 *   npx gene2-figma-mcp bridge
 */

export async function runBridge(_args: string[]): Promise<void> {
  // Dynamically import the server — it self-starts on import
  await import('../bridge/server.js');
}

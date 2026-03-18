/**
 * CLI: `mcp` command
 *
 * Starts the MCP server (stdio transport) for VS Code integration.
 * This is what .vscode/mcp.json invokes.
 *
 *   npx gene2-figma-mcp mcp
 */

export async function runMcp(_args: string[]): Promise<void> {
  // Dynamically import the MCP server — it self-starts on import
  await import('../bridge/mcp-server.js');
}

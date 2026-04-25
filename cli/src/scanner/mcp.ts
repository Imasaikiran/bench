import { promises as fs } from "node:fs";
import { join } from "node:path";
import { readConfigSurface } from "./config.js";

export type McpReport = { servers: string[]; hasGithub: boolean };

// §5.5 dim 13 detection regex
const GITHUB_RE = /github|mcp-github/i;

export async function readMcp(claudeHome: string): Promise<McpReport> {
  // Try mcp.json first
  let mcpServers: Record<string, unknown> | null = null;

  try {
    const text = await fs.readFile(join(claudeHome, "mcp.json"), "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const servers = parsed["mcpServers"];
    if (servers !== null && typeof servers === "object" && !Array.isArray(servers)) {
      mcpServers = servers as Record<string, unknown>;
    }
  } catch {
    // mcp.json absent or malformed — fall through to settings
  }

  // Fall back to settings.json mcpServers
  if (mcpServers === null) {
    const config = await readConfigSurface(claudeHome);
    const settingsServers = config.settings["mcpServers"];
    if (
      settingsServers !== null &&
      typeof settingsServers === "object" &&
      !Array.isArray(settingsServers)
    ) {
      mcpServers = settingsServers as Record<string, unknown>;
    }
  }

  if (mcpServers === null) {
    return { servers: [], hasGithub: false };
  }

  const servers = Object.keys(mcpServers);
  const hasGithub = servers.some((name) => GITHUB_RE.test(name));

  return { servers, hasGithub };
}

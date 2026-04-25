import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { join, basename } from "node:path";
import { readConfigSurface } from "./config.js";

export type HooksReport = {
  configured: number;
  orphaned: number;
  events: Record<string, string[]>;
};

// Valid hook file extensions per Claude Code convention
const HOOK_EXTENSIONS = new Set([".js", ".ts", ".py", ".sh"]);

export async function readHooks(claudeHome: string): Promise<HooksReport> {
  // Read disk hook files (non-recursive, one level under hooks/)
  const hooksDir = join(claudeHome, "hooks");
  const diskFiles: string[] = [];
  try {
    const entries: Dirent[] = await fs.readdir(hooksDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile()) {
        const ext = e.name.slice(e.name.lastIndexOf("."));
        if (HOOK_EXTENSIONS.has(ext)) {
          diskFiles.push(e.name);
        }
      }
    }
  } catch {
    // no hooks dir — fine
  }

  // Read settings to extract event → command[] map
  const config = await readConfigSurface(claudeHome);
  const hooksSettings = config.settings["hooks"];

  const events: Record<string, string[]> = {};

  if (hooksSettings !== null && typeof hooksSettings === "object" && !Array.isArray(hooksSettings)) {
    const hooksMap = hooksSettings as Record<string, unknown>;
    for (const eventName of Object.keys(hooksMap)) {
      const matchers = hooksMap[eventName];
      if (!Array.isArray(matchers)) continue;
      const commands: string[] = [];
      for (const matcher of matchers) {
        if (matcher === null || typeof matcher !== "object" || Array.isArray(matcher)) continue;
        const matcherObj = matcher as Record<string, unknown>;
        const hookList = matcherObj["hooks"];
        if (!Array.isArray(hookList)) continue;
        for (const hook of hookList) {
          if (hook === null || typeof hook !== "object" || Array.isArray(hook)) continue;
          const hookObj = hook as Record<string, unknown>;
          const cmd = hookObj["command"];
          if (typeof cmd === "string") {
            commands.push(cmd);
          }
        }
      }
      if (commands.length > 0) {
        events[eventName] = commands;
      }
    }
  }

  // Collect all basenames referenced in settings commands
  const referencedBasenames = new Set<string>();
  for (const cmds of Object.values(events)) {
    for (const cmd of cmds) {
      referencedBasenames.add(basename(cmd));
    }
  }

  // Cross-ref disk files against referenced basenames
  let configured = 0;
  let orphaned = 0;
  for (const file of diskFiles) {
    if (referencedBasenames.has(file)) {
      configured++;
    } else {
      orphaned++;
    }
  }

  return { configured, orphaned, events };
}

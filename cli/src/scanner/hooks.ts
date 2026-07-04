import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { basename, extname, join } from "node:path";
import { readConfigSurface } from "./config.js";

export type EventState = "present" | "referenced";

export type HooksReport = {
  configured: number;
  orphaned: number;
  events: Record<string, string[]>;
  parseWarnings: string[];
  /**
   * Per-event derived state, only for events that have >=1 command (Task A5).
   * "present": at least one command is a working hook — either inline (not a
   * file reference) or a reference to a hook file that exists on disk.
   * "referenced": every command in the event references a hook file that is
   * NOT on disk (wired in settings but the file is missing/broken).
   * Events with zero commands are omitted entirely (predicate reads this as
   * missing).
   */
  eventStates: Record<string, EventState>;
};

// Valid hook file extensions per Claude Code convention
const HOOK_EXTENSIONS = new Set([".js", ".ts", ".py", ".sh"]);
const HOOK_EXTENSIONS_RE = /\.(js|ts|py|sh)$/i;

// Interpreter tokens that commonly prefix a hook command, e.g.
// `node "/path/to/hook.js"` or `bash ~/.claude/hooks/x.sh`.
const INTERPRETER_PREFIX_RE = /^(node|bash|sh|python3?|npx|ts-node)\s+/i;

/**
 * Extract the file basename a hook command targets, tolerant of the
 * `interpreter "path"` shape Claude Code commonly writes into settings.json
 * (e.g. `node "/Users/x/.claude/hooks/foo.js"`). Strips a leading known
 * interpreter token and surrounding quotes before delegating to
 * node:path's `basename`, so `node "/a/hooks/foo.js"` and disk file `foo.js`
 * cross-reference correctly instead of comparing against a trailing quote.
 */
function commandBasename(cmd: string): string {
  const withoutInterpreter = cmd.trim().replace(INTERPRETER_PREFIX_RE, "");
  const unquoted = withoutInterpreter.trim().replace(/^["']|["']$/g, "");
  return basename(unquoted);
}

export async function readHooks(claudeHome: string): Promise<HooksReport> {
  const warnings: string[] = [];

  // Read disk hook files (non-recursive, one level under hooks/)
  const hooksDir = join(claudeHome, "hooks");
  const diskFiles: string[] = [];
  try {
    const entries: Dirent[] = await fs.readdir(hooksDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile()) {
        const ext = extname(e.name);
        if (HOOK_EXTENSIONS.has(ext)) {
          diskFiles.push(e.name);
        }
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      warnings.push(
        `${hooksDir}: ${(e as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
      );
    }
    // no hooks dir — fine
  }

  // Read settings to extract event → command[] map
  const config = await readConfigSurface(claudeHome);
  for (const w of config.parseWarnings) {
    warnings.push(w);
  }
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

  // Configured = every hook command declared in settings (inline or file-backed).
  // Orphaned = disk hook files that no settings command references.
  // Basename-only matching: settings commands like `~/.claude/hooks/x.sh` and a disk file
  // `x.sh` should both count even when paths differ. Trade-off: distinct hook files sharing a
  // basename across dirs would alias.
  const referencedBasenames = new Set<string>();
  let settingsHookCommands = 0;
  for (const cmds of Object.values(events)) {
    for (const cmd of cmds) {
      referencedBasenames.add(commandBasename(cmd));
      settingsHookCommands++;
    }
  }

  let orphaned = 0;
  for (const file of diskFiles) {
    if (!referencedBasenames.has(file)) orphaned++;
  }

  const configured = settingsHookCommands;
  const diskFileSet = new Set(diskFiles);

  // Per-command state (Task A5): reuses the same basename cross-ref as the
  // configured/orphaned counters above.
  //   - basename matches a file on disk           -> "present" (working file-backed hook)
  //   - looks like it names a hook file (path into
  //     a hooks/ dir, or ends in a known hook
  //     extension) but no matching disk file       -> "referenced" (wired but broken)
  //   - otherwise (inline shell, e.g. `echo hi`,
  //     `gstack-lint`, `npx …`)                     -> "present" (working inline hook)
  const looksLikeHookFileRef = (cmd: string): boolean =>
    cmd.includes("/hooks/") || HOOK_EXTENSIONS_RE.test(commandBasename(cmd));

  const commandState = (cmd: string): EventState => {
    if (diskFileSet.has(commandBasename(cmd))) return "present";
    if (looksLikeHookFileRef(cmd)) return "referenced";
    return "present";
  };

  // Per-event state: best of its commands' states (present > referenced).
  const eventStates: Record<string, EventState> = {};
  for (const [eventName, cmds] of Object.entries(events)) {
    let state: EventState = "referenced";
    for (const cmd of cmds) {
      if (commandState(cmd) === "present") {
        state = "present";
        break;
      }
    }
    eventStates[eventName] = state;
  }

  return { configured, orphaned, events, parseWarnings: warnings, eventStates };
}

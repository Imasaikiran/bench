#!/usr/bin/env node
/**
 * gen-tier-sessions.mjs
 *
 * Generates deterministic JSONL session fixture files for bench v2 tests.
 *
 * Usage:
 *   node cli/scripts/gen-tier-sessions.mjs <tier> <count> <start-date>
 *
 * Example:
 *   node cli/scripts/gen-tier-sessions.mjs tinkerer 60 2026-03-14
 *
 * Output:
 *   cli/test/fixtures/<tier>/projects/<tier>-gen/session-NNN.jsonl
 *
 * Determinism guarantee:
 *   All randomness is seeded from (tier + count + start-date). Re-running with
 *   the same arguments produces byte-identical files. No Date.now() or
 *   Math.random() calls.
 *
 * Session structure (3–8 lines per file):
 *   - 1 user message (role, content array with text, timestamp, cwd)
 *   - 1–2 assistant messages (role, content array, sometimes tool_use, timestamp, cwd)
 *   - ~5% of sessions include a plan_mode marker in a content text field
 *   - Timestamps spaced 5–60 seconds apart within a session
 *   - Session start times spread evenly from <start-date> forward to today
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Deterministic LCG (Linear Congruential Generator)
// ---------------------------------------------------------------------------
function makePrng(seedStr) {
  // Hash the seed string into a uint32
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) >>> 0);
  }
  let state = h === 0 ? 1 : h;
  // LCG: Numerical Recipes parameters
  return function next(max) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const [, , tier, countStr, startDateStr] = process.argv;

if (!tier || !countStr || !startDateStr) {
  console.error("Usage: node gen-tier-sessions.mjs <tier> <count> <start-date>");
  console.error("Example: node gen-tier-sessions.mjs tinkerer 60 2026-03-14");
  process.exit(1);
}

const count = parseInt(countStr, 10);
if (Number.isNaN(count) || count <= 0) {
  console.error("count must be a positive integer");
  process.exit(1);
}

const startMs = Date.parse(startDateStr);
if (Number.isNaN(startMs)) {
  console.error("start-date must be a valid ISO date string (e.g. 2026-03-14)");
  process.exit(1);
}

// Today is fixed for determinism: 2026-04-25
const todayMs = Date.parse("2026-04-25T00:00:00.000Z");
const spanMs = todayMs - startMs;
if (spanMs <= 0) {
  console.error("start-date must be before 2026-04-25");
  process.exit(1);
}

const rng = makePrng(`${tier}:${count}:${startDateStr}`);

const outDir = join(__dirname, "..", "test", "fixtures", tier, "projects", `${tier}-gen`);
await fs.mkdir(outDir, { recursive: true });

const cwdOptions = [
  `/Users/dev/projects/${tier}-app`,
  `/Users/dev/projects/${tier}-core`,
  `/home/user/work/${tier}`,
];

const toolNames = ["Bash", "Read", "Edit", "Write", "Glob"];

// Active skill names for the tinkerer fixture — cycling ensures all 4 appear
// at least once across the generated sessions. writing-tests and
// unused-old-skill are intentionally omitted so they remain "unused".
const ACTIVE_SKILL_NAMES = [
  "debugging-async",
  "running-builds",
  "using-fixtures",
  "using-git",
];

for (let i = 0; i < count; i++) {
  const pad = String(i + 1).padStart(3, "0");
  const filename = `session-${pad}.jsonl`;
  const outPath = join(outDir, filename);

  // Spread session start times evenly, with deterministic jitter
  const baseOffset = Math.floor((spanMs / count) * i);
  const jitter = rng(3600 * 1000); // up to 1h jitter
  const sessionStartMs = startMs + baseOffset + jitter;

  const cwd = cwdOptions[rng(cwdOptions.length)];

  // ~5% of sessions get a plan_mode marker (every ~20th session, deterministically)
  const isPlanMode = (rng(100) < 5);

  const lines = [];

  // User message
  let tMs = sessionStartMs;
  const userText = isPlanMode
    ? "Let's enter plan mode and figure out the architecture first."
    : `Task ${pad}: implement feature ${rng(1000)}`;
  lines.push(JSON.stringify({
    role: "user",
    content: [{ type: "text", text: userText }],
    timestamp: new Date(tMs).toISOString(),
    cwd,
  }));

  // 1–2 assistant messages
  const assistantCount = 1 + rng(2); // 1 or 2
  for (let a = 0; a < assistantCount; a++) {
    tMs += 5000 + rng(55) * 1000; // 5–60s gap

    const hasToolUse = rng(3) > 0; // ~67% have a tool use
    const contentBlocks = [];

    if (hasToolUse) {
      // Every ~5th tool_use block (deterministically), emit a Skill tool_use
      // instead of a standard tool. Cycle through the 4 active skill names so
      // all 4 are guaranteed to appear across the full session set.
      const globalToolIndex = i * 2 + a; // unique index across all sessions/turns
      const emitSkill = (globalToolIndex % 5 === 0);

      let toolBlock;
      if (emitSkill) {
        const skillIndex = Math.floor(globalToolIndex / 5) % ACTIVE_SKILL_NAMES.length;
        const skillName = ACTIVE_SKILL_NAMES[skillIndex];
        toolBlock = {
          type: "tool_use",
          id: `tu_${pad}_${a}_skill`,
          name: "Skill",
          input: { skill: skillName },
        };
      } else {
        const toolName = toolNames[rng(toolNames.length)];
        toolBlock = {
          type: "tool_use",
          id: `tu_${pad}_${a}`,
          name: toolName,
          input: toolName === "Read"
            ? { file_path: `${cwd}/src/index.ts`, bytes_read: 1024 + rng(4096) }
            : { command: `echo session-${pad}` },
        };
      }
      contentBlocks.push(toolBlock);
    }

    const replyText = isPlanMode && a === 0
      ? "<PlanModeStart>Breaking this into steps: 1) scaffold, 2) implement, 3) test.<PlanModeEnd>"
      : `Done with step ${a + 1} of session ${pad}.`;
    contentBlocks.push({ type: "text", text: replyText });

    lines.push(JSON.stringify({
      role: "assistant",
      content: contentBlocks,
      timestamp: new Date(tMs).toISOString(),
      cwd,
    }));
  }

  // Write file
  await fs.writeFile(outPath, lines.join("\n") + "\n", "utf8");
}

console.log(`Generated ${count} session files in ${outDir}`);
console.log(`Earliest session start: ${new Date(startMs).toISOString()}`);

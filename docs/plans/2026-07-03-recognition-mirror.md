# bench v2 — The Recognition Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bench produce a portrait that is *true, specific, and screenshot-worthy* for a real user on the first run, before any launch step runs.

**Architecture:** The research (three independent evaluations: PM / designer / growth psychology, plus field data from HN, ccusage, viberank, tokscale) converged on one root cause: the product currently says beautiful things about a synthetic person named Priya and false things about its actual user. The "missing magic" is **recognition** — the jolt of a machine saying something specific and true about you. This plan fixes truth first (scanner accuracy), then voice (identity from named artifacts), then reflection (render the real data, make the terminal the share artifact), then meaning (prevalence context, rescan delta), and gates launch on a founder-mirror test.

**Tech Stack:** TypeScript (Node ≥20.10), pnpm workspace, vitest. CLI at `cli/`, rubric at `rubric/`, web at `web/`. No new runtime dependencies for Phases A–D.

**Branch:** All work on `v2-dev` or `v2-dev/<task-slug>` branches merged back. Never touch `v1-bench`, tag `v1.0.0`, or `main`. The frozen v1 frontend sources are read-only; the CLI keeps its own working copy of the render assets under `cli/src/assets/`.

**Why this order:** A wrong low score is strictly worse than no score — engineers who upvote a setup post 568 points on HN will screenshot-*mock* a card that calls a 445-skill power user a "Tinkerer." Nothing downstream (OG images, claim flow, npm publish) adds life to a mirror showing the wrong face. Fix the mirror on the founder's own machine and the product is alive that afternoon.

---

## Verified root-cause findings (evidence, not hypothesis)

These were confirmed against the founder's real `~/.claude` during research. Each maps to a task below.

1. **Session parser reads the wrong JSON shape.** `cli/src/scanner/sessions.ts:143` checks `msg["role"] === "assistant"` and `msg["content"]`, but real Claude Code JSONL nests these under `msg.message` with `msg.type === "assistant"`. Confirmed: real entries have keys `['parentUuid','isSidechain','message','requestId','type','uuid','timestamp',...]` and `message.role === "assistant"`. This single mismatch zeroes `skills_active`, `toolUseCount`, plan-mode detection, and `avg_bytes_per_read` (the real scan showed `avg_bytes_per_read: 0`). → Task A1.
2. **Skill-name matching is too strict.** Even after the shape fix, `computeActiveSkills` (`index.ts:30`) matches session `input.skill` (invocation slugs, often plugin-namespaced like `superpowers:brainstorming`) against frontmatter `name` (`brainstorming`) by exact equality. → Task A2.
3. **Hook counting ignores inline hooks.** `cli/src/scanner/hooks.ts:87` only counts hook *files* in `~/.claude/hooks/` cross-referenced to settings. A user whose hooks are inline commands in `settings.json` (no separate file) scores `configured: 0` while `any_hook_present` is true. → Task A3.
4. **Detection failure renders as accusation.** Zeros from parser bugs surface as "missing" character judgments and a falsely-personalized "what to add" panel. → Task A4.
5. **Identity line slots raw commit tokens with no verb validation.** `cli/src/rubric/copy.ts:48` produces "You add to learn. You weekly to focus. You keep merging if it fits." ("weekly" is not a verb; verbs are just git-ceremony noise.) → Tasks B1–B2.
6. **Offline card renders synthetic Priya, not the user.** `cli/src/assets/script.js:440` hardcodes `let currentPersona = 'priya'` and boots `applyPersona('priya')`, ignoring the injected `window.__BENCH_PERSONA__` / `window.__BENCH_KEY__`. The `PREVIEW · Sam · Priya · Maya · Alex` toggle stays on a real scan. → Task C1.
7. **Terminal output is 4 plain lines at the peak-dopamine moment.** `cli/src/preview.ts` — the first and cheapest share surface is a log line. → Task C2.
8. **Naked "Bench 23" carries no social information.** No reference frame, so it can't flex, humblebrag, or self-deprecate. → Task D1.

---

## File structure

**Modified:**
- `cli/src/scanner/sessions.ts` — unwrap `message`; add message-shape helper (A1)
- `cli/src/scanner/index.ts` — normalized skill matching; confidence flags (A2, A4)
- `cli/src/scanner/hooks.ts` — count inline settings hooks (A3)
- `cli/src/rubric/copy.ts` — verb whitelist, named-artifact identity, tier fallback (B1, B2)
- `cli/src/preview.ts` — ANSI terminal card (C2)
- `cli/src/assets/offline-template.html` + build wiring — inject real persona into render (C1)
- `cli/src/why.ts` — human-readable musthaves (B3)

**Created:**
- `cli/src/scanner/message-shape.ts` — one place that knows Claude Code's JSONL envelope (A1)
- `cli/src/scanner/confidence.ts` — per-signal confidence gate (A4)
- `cli/src/rubric/verbs.ts` — verb whitelist + line variants (B1)
- `cli/src/rubric/prevalence.ts` — prevalence lookup from a bundled reference table (D1)
- `rubric/prevalence.json` — bundled "of N benchmarked setups" reference data (D1)
- `cli/src/delta.ts` — diff two `bench-scan.json` files (D2)
- Test files alongside each (`*.test.ts`)

**Read-only (never edit):** anything on `v1-bench` / tag `v1.0.0`; `docs/specs/2026-04-25-bench-v2-design.md` (reference).

---

# PHASE A — TRUTH (scanner accuracy)

*Exit criterion: the founder's own `~/.claude` scan reports nonzero `skills_active`, nonzero `hooks_configured`, and a tier that the founder agrees is not insulting.*

### Task A1: Unwrap the Claude Code message envelope

**Files:**
- Create: `cli/src/scanner/message-shape.ts`
- Create: `cli/src/scanner/message-shape.test.ts`
- Modify: `cli/src/scanner/sessions.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/scanner/message-shape.test.ts
import { describe, it, expect } from "vitest";
import { normalizeEntry } from "./message-shape.js";

describe("normalizeEntry", () => {
  it("extracts role and content from the real Claude Code envelope", () => {
    const raw = {
      type: "assistant",
      timestamp: "2026-05-01T10:00:00Z",
      cwd: "/Users/x/proj",
      message: { role: "assistant", content: [{ type: "tool_use", name: "Skill", input: { skill: "brainstorming" } }] },
    };
    const n = normalizeEntry(raw);
    expect(n.role).toBe("assistant");
    expect(n.content).toHaveLength(1);
    expect(n.timestamp).toBe("2026-05-01T10:00:00Z");
    expect(n.cwd).toBe("/Users/x/proj");
  });

  it("falls back to legacy top-level shape when message is absent", () => {
    const raw = { role: "assistant", content: [], timestamp: "2026-05-01T10:00:00Z" };
    const n = normalizeEntry(raw);
    expect(n.role).toBe("assistant");
    expect(n.content).toEqual([]);
  });

  it("returns nulls for non-message operation lines", () => {
    const raw = { type: "operation", operation: "compact", timestamp: "2026-05-01T10:00:00Z" };
    const n = normalizeEntry(raw);
    expect(n.role).toBeNull();
    expect(n.content).toBeNull();
    expect(n.timestamp).toBe("2026-05-01T10:00:00Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C cli exec vitest run src/scanner/message-shape.test.ts`
Expected: FAIL — "Cannot find module './message-shape.js'".

- [ ] **Step 3: Write the implementation**

```typescript
// cli/src/scanner/message-shape.ts
export type NormalizedEntry = {
  role: string | null;
  content: unknown[] | null;
  timestamp: string | null;
  cwd: string | null;
};

/**
 * Claude Code writes session JSONL where assistant/user turns nest role+content
 * under `message`, with `type` at the top level (`type: "assistant"`). Older or
 * synthetic fixtures may put role/content at the top level. Operation lines
 * (compaction, summaries) carry neither. This is the ONLY place that knows the
 * envelope shape — every scanner reads through it.
 */
export function normalizeEntry(raw: Record<string, unknown>): NormalizedEntry {
  const msg =
    raw["message"] && typeof raw["message"] === "object" && !Array.isArray(raw["message"])
      ? (raw["message"] as Record<string, unknown>)
      : raw;

  const role =
    typeof msg["role"] === "string"
      ? msg["role"]
      : typeof raw["type"] === "string" && (raw["type"] === "assistant" || raw["type"] === "user")
        ? raw["type"]
        : null;

  const content = Array.isArray(msg["content"]) ? (msg["content"] as unknown[]) : null;
  const timestamp = typeof raw["timestamp"] === "string" ? raw["timestamp"] : null;
  const cwd = typeof raw["cwd"] === "string" ? raw["cwd"] : null;

  return { role, content, timestamp, cwd };
}
```

- [ ] **Step 4: Rewire `sessions.ts` to read through `normalizeEntry`**

In `cli/src/scanner/sessions.ts`, replace the per-line body inside `for await (const line of rl)` (currently lines ~110–193). After `JSON.parse` narrows `msg`, add:

```typescript
        const entry = normalizeEntry(msg);

        if (entry.timestamp) {
          const t = Date.parse(entry.timestamp);
          if (!Number.isNaN(t)) timestamps.push(t);
        }

        if (entry.role === "assistant" && entry.content) {
          report.messageCount++;
          for (const c of entry.content) {
            if (typeof c === "object" && c !== null && (c as Record<string, unknown>)["type"] === "tool_use") {
              report.toolUseCount++;
              const block = c as Record<string, unknown>;
              if (block["name"] === "Read") {
                const input = block["input"];
                const bytes = Number(
                  input && typeof input === "object" ? (input as Record<string, unknown>)["bytes_read"] : undefined,
                );
                if (!Number.isNaN(bytes)) { report.readBytesSum += bytes; report.readBytesCount++; }
              }
              if (block["name"] === "Skill") {
                const input = block["input"];
                if (input && typeof input === "object") {
                  const skillName = (input as Record<string, unknown>)["skill"];
                  if (typeof skillName === "string") usedSkillsSet.add(skillName);
                }
              }
            }
          }
          const blob = JSON.stringify(entry.content);
          if (PLAN_MODE_RE.test(blob)) planMode = true;
        }

        if (entry.cwd) projectRootsSet.add(entry.cwd);
```

Add the import at the top: `import { normalizeEntry } from "./message-shape.js";`

Remove the now-dead old block that referenced `msg["role"]`, `msg["content"]`, `msg["cwd"]` directly. Keep `report.messageCount++` only in the new location (do not double-count).

- [ ] **Step 5: Run message-shape + sessions tests**

Run: `pnpm -C cli exec vitest run src/scanner/message-shape.test.ts src/scanner/sessions.test.ts`
Expected: PASS. If `sessions.test.ts` fixtures used the old top-level shape, update those fixtures to the nested `message` envelope (they were testing a shape that never occurs in production).

- [ ] **Step 6: Manual verification against real data**

Run: `pnpm -C cli build && node cli/dist/index.js --offline` (from a scratch dir), then inspect `bench-scan.json`.
Expected: `counts.skills_active > 0`, `counts.tool` paths nonzero, `avg_bytes_per_read` may still be 0 (Read input uses `file_path`, not `bytes_read` — that is a separate known gap, out of scope here). Record the observed `skills_active` in the commit body.

- [ ] **Step 7: Commit**

```bash
git add cli/src/scanner/message-shape.ts cli/src/scanner/message-shape.test.ts cli/src/scanner/sessions.ts cli/src/scanner/sessions.test.ts
git commit -m "fix(scanner): read Claude Code message envelope (message.role/content)

Real session JSONL nests role+content under message with type:assistant.
Prior code read top-level role/content, zeroing skills_active, tool counts,
and plan-mode. Founder scan now reports skills_active=<N>."
```

---

### Task A2: Normalize skill-name matching

**Files:**
- Modify: `cli/src/scanner/index.ts` (the `computeActiveSkills` function, ~line 30)
- Test: `cli/src/scanner/index.test.ts` (add cases; create if absent)

- [ ] **Step 1: Write the failing test**

```typescript
// add to cli/src/scanner/index.test.ts
import { describe, it, expect } from "vitest";
import { normalizeSkillName } from "./index.js";

describe("normalizeSkillName", () => {
  it("strips plugin namespace prefix", () => {
    expect(normalizeSkillName("superpowers:brainstorming")).toBe("brainstorming");
  });
  it("lowercases and trims", () => {
    expect(normalizeSkillName("  Using-Superpowers ")).toBe("using-superpowers");
  });
  it("is idempotent on plain names", () => {
    expect(normalizeSkillName("cto-engineering-os")).toBe("cto-engineering-os");
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/scanner/index.test.ts -t normalizeSkillName`
Expected: FAIL — `normalizeSkillName` not exported.

- [ ] **Step 3: Implement and rewire**

In `cli/src/scanner/index.ts`, add and export:

```typescript
export function normalizeSkillName(name: string): string {
  const afterColon = name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name;
  return afterColon.trim().toLowerCase();
}
```

Change `computeActiveSkills` to match on normalized names, also falling back to the skill's directory slug when frontmatter `name` is null:

```typescript
function computeActiveSkills(skills: SkillsReport, sessions: SessionsReport): number {
  const usedSet = new Set(sessions.usedSkills.map(normalizeSkillName));
  let active = 0;
  for (const skill of skills.items) {
    const candidates = [skill.name, skill.dir.split("/").pop() ?? null]
      .filter((n): n is string => n !== null)
      .map(normalizeSkillName);
    if (candidates.some((c) => usedSet.has(c))) active++;
  }
  return active;
}
```

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm -C cli exec vitest run src/scanner/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/scanner/index.ts cli/src/scanner/index.test.ts
git commit -m "fix(scanner): normalize skill names before active-skill match

Session invocations are plugin-namespaced slugs (superpowers:brainstorming);
frontmatter name is the bare slug. Match on normalized form + dir slug."
```

---

### Task A3: Count inline settings hooks

**Files:**
- Modify: `cli/src/scanner/hooks.ts`
- Test: `cli/src/scanner/hooks.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// add to cli/src/scanner/hooks.test.ts — build a temp claudeHome with settings.json
// that defines a SessionStart hook as an inline command and NO file in hooks/.
it("counts inline settings-defined hooks even with no hook files on disk", async () => {
  const home = await makeTempHome({
    "settings.json": JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ command: "echo hi" }] }] },
    }),
  });
  const r = await readHooks(home);
  expect(r.configured).toBeGreaterThanOrEqual(1);
});
```

(Use the existing temp-home helper in the test file; if none exists, write files under `os.tmpdir()` and clean up in `afterEach`.)

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/scanner/hooks.test.ts`
Expected: FAIL — `configured` is 0 because there are no matching disk files.

- [ ] **Step 3: Fix the counting logic**

In `cli/src/scanner/hooks.ts`, after building `events`, count *configured hooks* as the number of hook command entries defined in settings, unioned with matched disk files. Replace the final counting block (lines ~79–97) with:

```typescript
  // Configured = every hook command declared in settings (inline or file-backed).
  // Orphaned = disk hook files that no settings command references.
  const referencedBasenames = new Set<string>();
  let settingsHookCommands = 0;
  for (const cmds of Object.values(events)) {
    for (const cmd of cmds) {
      referencedBasenames.add(basename(cmd));
      settingsHookCommands++;
    }
  }

  let orphaned = 0;
  for (const file of diskFiles) {
    if (!referencedBasenames.has(file)) orphaned++;
  }

  const configured = settingsHookCommands;
  return { configured, orphaned, events, parseWarnings: warnings };
```

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm -C cli exec vitest run src/scanner/hooks.test.ts`
Expected: PASS. Re-run the full scanner suite: `pnpm -C cli test` — fix any orphaned-fraction test that assumed the old file-only semantics.

- [ ] **Step 5: Commit**

```bash
git add cli/src/scanner/hooks.ts cli/src/scanner/hooks.test.ts
git commit -m "fix(scanner): count inline settings hooks as configured

Hooks defined as inline commands in settings.json (no separate file) were
scored 0. Configured now counts declared hook commands; orphaned counts
unreferenced disk files."
```

---

### Task A4: Confidence gate — never render a parser failure as "missing"

**Files:**
- Create: `cli/src/scanner/confidence.ts`
- Create: `cli/src/scanner/confidence.test.ts`
- Modify: `cli/src/scanner/index.ts` (attach `confidence` to the emitted profile)

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/scanner/confidence.test.ts
import { describe, it, expect } from "vitest";
import { sessionConfidence } from "./confidence.js";

describe("sessionConfidence", () => {
  it("is low when sessions parsed but zero tool_use blocks were seen", () => {
    expect(sessionConfidence({ sessionsTotal: 200, toolUseCount: 0 })).toBe("low");
  });
  it("is high when tool_use blocks were seen", () => {
    expect(sessionConfidence({ sessionsTotal: 200, toolUseCount: 5000 })).toBe("high");
  });
  it("is unknown when no sessions exist at all", () => {
    expect(sessionConfidence({ sessionsTotal: 0, toolUseCount: 0 })).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/scanner/confidence.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```typescript
// cli/src/scanner/confidence.ts
export type Confidence = "high" | "low" | "unknown";

/**
 * If we parsed many sessions but saw zero tool_use blocks, our reader is
 * almost certainly mis-shaped for this machine — signals derived from tool_use
 * (skills_active, plan-mode, automation) must render as "couldn't verify",
 * never as "missing" (an accusation).
 */
export function sessionConfidence(x: { sessionsTotal: number; toolUseCount: number }): Confidence {
  if (x.sessionsTotal === 0) return "unknown";
  if (x.toolUseCount === 0) return "low";
  return "high";
}
```

- [ ] **Step 4: Attach to the profile**

In `cli/src/scanner/index.ts`, import `sessionConfidence`, compute it from the sessions report, and add to the emitted profile object a `confidence` block:

```typescript
    confidence: {
      tool_derived: sessionConfidence({
        sessionsTotal: sessions.sessionsTotal,
        toolUseCount: sessions.toolUseCount,
      }),
    },
```

Downstream consumers (score/copy/musthaves) read `confidence.tool_derived`; when it is `"low"`, they must render tool-derived chapters as "couldn't verify" and show the community "what to add" list *unpersonalized* rather than claiming the user is missing items. (Wire the render side in Task B3 and C1.)

- [ ] **Step 5: Run + commit**

```bash
pnpm -C cli exec vitest run src/scanner/confidence.test.ts
git add cli/src/scanner/confidence.ts cli/src/scanner/confidence.test.ts cli/src/scanner/index.ts
git commit -m "feat(scanner): emit tool-derived confidence to gate false 'missing' states"
```

---

# PHASE B — VOICE (identity from named artifacts)

*Exit criterion: the identity line is grammatical English built from artifacts the user recognizes, or it says less. No non-verbs. No mad-libs slop.*

### Task B1: Verb whitelist + hand-written line variants

**Files:**
- Create: `cli/src/rubric/verbs.ts`
- Create: `cli/src/rubric/verbs.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/rubric/verbs.test.ts
import { describe, it, expect } from "vitest";
import { pickVerbs, isKnownVerb } from "./verbs.js";

describe("verb whitelist", () => {
  it("rejects non-verbs like 'weekly'", () => {
    expect(isKnownVerb("weekly")).toBe(false);
  });
  it("accepts real commit verbs", () => {
    for (const v of ["add", "fix", "refactor", "ship", "merge", "build"]) {
      expect(isKnownVerb(v)).toBe(true);
    }
  });
  it("filters a raw token list down to known verbs, preserving order", () => {
    expect(pickVerbs(["weekly", "fix", "chore", "refactor"])).toEqual(["fix", "refactor"]);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/rubric/verbs.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```typescript
// cli/src/rubric/verbs.ts
// Curated set of legitimate commit-subject verbs. Non-verbs that show up as the
// first token of commit subjects (weekly, wip, misc, v2, initial) are excluded.
const KNOWN_VERBS = new Set<string>([
  "add", "build", "fix", "refactor", "ship", "merge", "remove", "rename",
  "update", "improve", "clean", "test", "document", "wire", "extract",
  "revert", "split", "simplify", "harden", "migrate", "tune", "polish",
  "prune", "cache", "gate", "guard", "port", "bump", "format",
]);

export function isKnownVerb(token: string): boolean {
  return KNOWN_VERBS.has(token.trim().toLowerCase());
}

export function pickVerbs(tokens: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (isKnownVerb(t) && !out.includes(t.toLowerCase())) out.push(t.toLowerCase());
  }
  return out;
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm -C cli exec vitest run src/rubric/verbs.test.ts
git add cli/src/rubric/verbs.ts cli/src/rubric/verbs.test.ts
git commit -m "feat(rubric): verb whitelist so identity copy never slots non-verbs"
```

---

### Task B2: Rebuild the identity line from named artifacts

**Files:**
- Modify: `cli/src/rubric/copy.ts`
- Test: `cli/src/rubric/copy.test.ts`

**Design contract:** The identity line must be *verifiable against the user's own machine* (the "how did it know that?" jolt). Prefer named counts (skills installed, project roots touched, sessions in N weeks, plan-mode habit) over generic verb poetry. Fall back to a short true sentence when evidence is thin. Never emit a line containing an unvetted token.

- [ ] **Step 1: Write the failing test**

```typescript
// add to cli/src/rubric/copy.test.ts
import { describe, it, expect } from "vitest";
import { deriveCopy } from "./copy.js";

describe("deriveCopy identity", () => {
  it("uses named artifacts when counts are strong", () => {
    const c = deriveCopy({
      signatureVerbs: ["add", "merge"],
      hours_with_cc: 161,
      skillsTotal: 445, projectRoots: 73, sessionsTotal: 250, weeksOnCc: 9,
      planModeRatio: 0.4,
    });
    // Must reference real numbers, be grammatical, contain no raw non-verbs.
    expect(c.identity).toMatch(/445|73|250/);
    expect(c.identity).not.toMatch(/weekly/);
    expect(c.identity.endsWith(".")).toBe(true);
  });

  it("falls back to a short true line when evidence is thin", () => {
    const c = deriveCopy({ signatureVerbs: [], hours_with_cc: null,
      skillsTotal: 0, projectRoots: 0, sessionsTotal: 3, weeksOnCc: 1, planModeRatio: 0 });
    expect(c.identity.length).toBeGreaterThan(0);
    expect(c.identity).not.toMatch(/undefined|NaN|\bto learn\. You\b.*\bto focus\b/);
  });

  it("never interpolates a non-verb even if passed one", () => {
    const c = deriveCopy({ signatureVerbs: ["weekly", "wip"], hours_with_cc: 20,
      skillsTotal: 5, projectRoots: 2, sessionsTotal: 40, weeksOnCc: 4, planModeRatio: 0 });
    expect(c.identity).not.toMatch(/weekly|wip/);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/rubric/copy.test.ts`
Expected: FAIL — `deriveCopy` doesn't accept the new context fields and current output contains raw verbs.

- [ ] **Step 3: Rewrite `deriveCopy`**

Replace the body of `cli/src/rubric/copy.ts` (keep `gerundize` export for compatibility) so `CopyContext` accepts named-artifact counts and the identity is assembled from a small set of evidence-gated clauses:

```typescript
import { pickVerbs } from "./verbs.js";

const HOURS_FLOOR = 5;

export type CopyContext = {
  signatureVerbs?: readonly string[];
  hours_with_cc?: number | null;
  skillsTotal?: number;
  projectRoots?: number;
  sessionsTotal?: number;
  weeksOnCc?: number;
  planModeRatio?: number;
};

export type DerivedCopy = {
  signature_verbs: string[];
  identity: string;
  hours_meaning: string;
  hours_label: string;
};

export function deriveCopy(ctx: CopyContext): DerivedCopy {
  const verbs = pickVerbs(ctx.signatureVerbs ?? []).slice(0, 3);
  const skills = ctx.skillsTotal ?? 0;
  const roots = ctx.projectRoots ?? 0;
  const sessions = ctx.sessionsTotal ?? 0;
  const weeks = ctx.weeksOnCc ?? 0;
  const planRatio = ctx.planModeRatio ?? 0;

  // Build up to two evidence clauses, strongest first. Each is a true, checkable
  // statement. If none qualify, fall back to a verb line (whitelisted) or a stub.
  const clauses: string[] = [];
  if (skills >= 20 && roots >= 5) {
    clauses.push(`${skills} skills installed across ${roots} projects: you collect capability faster than you spend it`);
  } else if (sessions >= 20 && weeks >= 2) {
    clauses.push(`${sessions} sessions in ${weeks} weeks: this is a daily tool for you, not an experiment`);
  }
  if (planRatio >= 0.25) {
    clauses.push(`you plan before you build`);
  } else if (verbs.length >= 1) {
    clauses.push(`you ${verbs[0]!} more than anything else`);
  }

  let identity: string;
  if (clauses.length > 0) {
    identity = clauses.map((c, i) => (i === 0 ? c[0]!.toUpperCase() + c.slice(1) : c)).join(". ") + ".";
  } else if (verbs.length >= 1) {
    identity = `You ${verbs[0]!}.`;
  } else {
    identity = "Early days. Come back after a few more sessions.";
  }

  const h = typeof ctx.hours_with_cc === "number" && Number.isFinite(ctx.hours_with_cc) ? ctx.hours_with_cc : 0;
  const workdays = Math.round(h / 8);
  const hours_meaning =
    h >= HOURS_FLOOR
      ? `~${workdays} workdays of pair-programming — whatever you made, you made it together`
      : "";

  return { signature_verbs: verbs, identity, hours_meaning, hours_label: "hours with Claude Code" };
}
```

- [ ] **Step 4: Wire the new context at the call site**

Find where `deriveCopy` is called in the scan pipeline (grep: `pnpm -C cli exec grep -rn "deriveCopy(" src`). Pass the new fields from the scanner counts (`skills_total`, `project_root_count`, `sessions_total`, `weeks_on_cc`, `plan_mode_ratio`). Keep exact count field names consistent with `scanner/index.ts` output.

- [ ] **Step 5: Run to verify PASS**

Run: `pnpm -C cli exec vitest run src/rubric/copy.test.ts`
Expected: PASS.

- [ ] **Step 6: Manual check on real data**

Run: `pnpm -C cli build && node cli/dist/index.js --offline`, read `bench-scan.json` `identity` field.
Expected: a grammatical line referencing real numbers, e.g. "445 skills installed across 73 projects: you collect capability faster than you spend it. You plan before you build."

- [ ] **Step 7: Commit**

```bash
git add cli/src/rubric/copy.ts cli/src/rubric/copy.test.ts
git commit -m "feat(rubric): identity line from named artifacts, not verb mad-libs

Replaces 'You add to learn. You weekly to focus.' with evidence-gated,
grammatical clauses built from skills/projects/sessions/plan-mode counts."
```

---

### Task B3: Human-readable musthaves + confidence-gated panel

**Files:**
- Modify: `cli/src/why.ts` (and wherever `musthaves` strings like `"#21 Focus"` are produced)
- Test: alongside

- [ ] **Step 1: Write the failing test**

```typescript
// asserts a musthave renders as human name + one-line why, not "#21 Focus"
it("renders musthaves as name + reason, never a raw rubric id", () => {
  const lines = renderMustHaves([{ id: 21, key: "focus" }], { confidence: "high" });
  expect(lines[0]).not.toMatch(/^#\d+/);
  expect(lines[0]).toMatch(/clean|focus|prune/i);
});

it("shows the community list unpersonalized when confidence is low", () => {
  const lines = renderMustHaves([{ id: 21, key: "focus" }], { confidence: "low" });
  expect(lines.join(" ")).toMatch(/community|couldn.t verify/i);
});
```

- [ ] **Step 2–4:** Run (FAIL) → implement a `key → { name, why }` lookup table and the confidence branch → run (PASS). Map every rubric row id used in musthaves to a human name and a one-sentence reason (source of truth: `rubric/rubric.yaml` dimension descriptions).

- [ ] **Step 5: Commit**

```bash
git commit -am "fix(cli): musthaves show human name + reason; gate panel on confidence"
```

---

# PHASE C — REFLECTION (render the real face)

*Exit criterion: the offline card shows the scanned user's data with no PREVIEW toggle, and `npx bench` prints a screenshot-worthy terminal card.*

### Task C1: Fix the offline render bridge

**Files:**
- Modify: `cli/src/assets/offline-template.html` (injection block)
- Modify: build/asset pipeline as needed (the CLI's working copy of `script.js`, NOT the frozen v1 source)
- Test: `cli/src/local-export.test.ts` (assert rendered HTML honors injected data)

**Root cause:** `cli/src/assets/script.js:440,464` hardcodes `currentPersona = 'priya'` and boots `applyPersona('priya')`, and `PERSONAS` is a lexical `const` unreachable from the injected `window.PERSONAS`. The injected real data is ignored.

**Approach (respects the frozen-v1 boundary):** The CLI owns its render copy under `cli/src/assets/`. Append a small bootstrap override to the offline template *after* `script.js` that (a) re-applies the injected persona through the existing global `applyPersona`, and (b) removes the preview switcher chrome. Because `applyPersona` reads from the lexical `const PERSONAS`, the override must instead call the individual `renderHero/renderAtelier/renderChapters/renderMustHaves` globals with the injected object, OR the build step must replace the `const PERSONAS = {…}` literal and the `applyPersona('priya')` boot call with the injected key. Prefer the build-step replacement: it is deterministic and keeps one render path.

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/local-export.test.ts
it("rendered offline HTML uses the injected persona, not priya", async () => {
  const dir = await mkdtemp();
  const payload = makePayload({ hours_with_cc: 161, tier: "Tinkerer", score: 23, weeks_on_cc: 9 });
  const persona = { hours: 161, tier: "Tinkerer", score: 23, weeks: 9, handle: null,
    identity: "445 skills installed across 73 projects.", signature_verbs: ["add", "merge"] };
  await writeLocalExport(dir, payload, persona);
  const html = await fs.readFile(join(dir, "bench-scan.html"), "utf8");
  // The boot call must not hardcode priya, and preview chrome must be gone for a real scan.
  expect(html).not.toMatch(/applyPersona\('priya'\)/);
  expect(html).toMatch(/161/);
  expect(html).not.toMatch(/data-persona="maya"/); // preview switcher removed
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/local-export.test.ts`
Expected: FAIL — current output hardcodes priya and keeps the switcher.

- [ ] **Step 3: Implement the build-step patch**

In `writeLocalExport` (or the prebuild that assembles `cli/src/assets/script.js`), after loading the `js` asset, transform it before substitution:

```typescript
  // Point the frozen v1 render at the injected real persona and strip preview chrome.
  const patchedJs = js
    .replace(/let currentPersona = ['"]priya['"];/, "let currentPersona = '_current';")
    .replace(/applyPersona\(['"]priya['"]\)/g, "applyPersona('_current')");
```

Ensure the injected `window.PERSONAS` object (already emitted by the template) is what `applyPersona` reads. If `applyPersona` reads the lexical `const PERSONAS`, also inject `_current` into that const via a second targeted replace of the `const PERSONAS = {` opening to `const PERSONAS = { _current: window.__BENCH_PERSONA__,`. Additionally strip the preview switcher markup: in `extractV1Body`, remove the `.persona-switch` / `.ps-btn` container (add a regex removal for the switcher block, scoped to the offline body only — never edit the v1 source file).

- [ ] **Step 4: Run to verify PASS + visual check**

Run: `pnpm -C cli exec vitest run src/local-export.test.ts && pnpm -C cli build && node cli/dist/index.js --offline`
Then render `bench-scan.html` in a browser (or the browse skill) and confirm: hero shows the real hours, tier, weeks; identity line is the real one; no PREVIEW/Sam/Priya/Maya/Alex toggle; footer no longer says "SYNTHETIC PREVIEW".

- [ ] **Step 5: Commit**

```bash
git add cli/src/local-export.ts cli/src/assets/offline-template.html cli/src/local-export.test.ts
git commit -m "fix(cli): offline card renders the scanned user, not synthetic Priya

Repoint the v1 render at the injected persona and strip the preview switcher
for real scans. The mirror finally shows the right face."
```

---

### Task C2: The terminal is the first share artifact

**Files:**
- Modify: `cli/src/preview.ts`
- Test: `cli/src/preview.test.ts`

**Design contract (from growth + design research):** Devs screenshot terminals (neofetch, onefetch tradition). The output must fit one screenshot (≤ ~16 rows), stay 100% honest, and carry: hero hours (large/accent), meaning line, tier, five chapter names with block-bar gauges (`▓▓▓░░`), one identity line, and the bench URL as the last line. Use ANSI color but degrade gracefully when `!process.stdout.isTTY` or `NO_COLOR` is set.

- [ ] **Step 1: Write the failing test**

```typescript
// cli/src/preview.test.ts
import { describe, it, expect } from "vitest";
import { renderPreview } from "./preview.js";

describe("renderPreview terminal card", () => {
  const input = {
    hours_with_cc: 161, score: 23, tier: "Tinkerer", weeks_on_cc: 9,
    identity: "445 skills across 73 projects.",
    chapters: { Foundation: 48, Automation: 10, Delegation: 33, Craft: 28, Coherence: 8 },
    url: "bench.dev",
  };
  it("shows the hero hours and all five chapter names", () => {
    const out = renderPreview(input, { color: false });
    expect(out).toMatch(/161/);
    for (const c of ["Foundation", "Automation", "Delegation", "Craft", "Coherence"]) {
      expect(out).toMatch(new RegExp(c));
    }
  });
  it("draws a proportional bar per chapter", () => {
    const out = renderPreview(input, { color: false });
    expect(out).toMatch(/[▓█][▓█░ ]*░/); // filled + empty cells
  });
  it("ends with the URL and fits one screenshot (<= 16 lines)", () => {
    const out = renderPreview(input, { color: false });
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(16);
    expect(lines[lines.length - 1]).toMatch(/bench\.dev/);
  });
  it("omits ANSI codes when color is disabled", () => {
    const out = renderPreview(input, { color: false });
    expect(out).not.toMatch(/\[/);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm -C cli exec vitest run src/preview.test.ts`
Expected: FAIL — current `renderPreview` returns 4 lines and no chapters/url params.

- [ ] **Step 3: Implement the ANSI card**

Rewrite `cli/src/preview.ts` with a `PreviewInput` that includes `identity`, `chapters`, `url`, and an options arg `{ color?: boolean }` (default `process.stdout.isTTY && !process.env.NO_COLOR`). Build a `bar(score: number, cells = 10)` helper returning `▓`×round(score/100·cells) + `░`×rest. Compose ≤16 lines. Keep the honest hours-absent branch ("scoring without hours yet — come back in a week"). No new dependency; hand-roll the few ANSI escapes behind the `color` flag.

- [ ] **Step 4: Run to verify PASS + eyeball**

Run: `pnpm -C cli exec vitest run src/preview.test.ts && pnpm -C cli build && node cli/dist/index.js --offline`
Expected: PASS, and the terminal shows a composed card you would screenshot.

- [ ] **Step 5: Commit**

```bash
git add cli/src/preview.ts cli/src/preview.test.ts
git commit -m "feat(cli): terminal portrait card (hero hours, chapter bars, identity)

The cheapest share surface was 4 plain lines; make it screenshot-worthy."
```

---

# PHASE D — MEANING (context that makes a number shareable)

*Exit criterion: the score carries a prevalence frame, and a rescan shows the delta. Preserves the no-leaderboard rule (prevalence ≠ rank).*

### Task D1: Prevalence framing ("only N% of setups have this")

**Files:**
- Create: `rubric/prevalence.json` (bundled reference table: per-dimension "share of benchmarked setups that have it", seeded honestly from the public setups the founder benchmarks — e.g. "of the 50 public setups we scored")
- Create: `cli/src/rubric/prevalence.ts` + test
- Modify: the profile assembly to attach a `prevalence_notes` array and one `headline_rarity` string for the card

**Design contract (growth research):** Attach prevalence, not rank. "Only 9% of benchmarked setups have a verification hook — you do." This gives every score a humblebrag cover (the stat made them say it) without a leaderboard. Cold-start honesty: label the denominator ("of 50 public setups we benchmarked").

- [ ] **Step 1:** Write failing test: `pickHeadlineRarity(profile, table)` returns the rarest *present* strength as "only N% of setups have <X> — you do", and null when nothing qualifies.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement lookup: for each dimension the user *has*, read its prevalence; pick the lowest-prevalence present strength; format with the denominator label. For missing dimensions, optionally surface "N% have <X>" as aspirational context in the musthaves panel.
- [ ] **Step 4:** Run → PASS. Wire `headline_rarity` into both the terminal card (C2) and the offline card (C1) render.
- [ ] **Step 5:** Commit `feat(rubric): prevalence framing gives the score social meaning (no leaderboard)`.

---

### Task D2: Delta on rescan (the comeback trigger)

**Files:**
- Create: `cli/src/delta.ts` + test
- Modify: CLI entry (`cli/src/index.ts`) to detect a prior `bench-scan.json` and print the delta

**Design contract (PM research):** The only frame in which a low first score becomes an asset is before/after ("day 1: 23. day 9: Craftsman."). Deterministic scoring has no variable reward, so the reward must be *progress*. Local diff of two `bench-scan.json` files needs no backend.

- [ ] **Step 1:** Write failing test: `diffScans(prev, cur)` returns `{ scoreDelta, tierCrossed, gainedChapters, gainedMusthaves }`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement pure diff over the two payload shapes.
- [ ] **Step 4:** Run → PASS. In `cli/src/index.ts`, before writing the new `bench-scan.json`, if one exists in the target dir, load it, compute the delta, and surface a delta banner in the terminal card ("+11 since last scan · Tinkerer → Craftsman"). The "what to add" panel prices each item by its score contribution ("PreToolUse hook +6").
- [ ] **Step 5:** Commit `feat(cli): rescan delta banner — progress is the reward`.

---

# PHASE E — GATE + LAUNCH PREP

*Do not run any distribution step until Task E1 passes.*

### Task E1: The founder-mirror acceptance gate

- [ ] Run `pnpm -C cli build && node cli/dist/index.js --offline` against the founder's real `~/.claude`.
- [ ] Open `bench-scan.html`. **Gate:** the founder confirms, unprompted, "I would post this." Specifically verify: (a) `skills_active` and `hooks_configured` are nonzero and correct; (b) tier is not insulting for a power user; (c) identity line is true and grammatical; (d) no synthetic Priya data, no preview toggle; (e) terminal card is screenshot-worthy; (f) a prevalence line is present and true.
- [ ] If any sub-check fails, return to the owning task. This gate is the whole product compressed into one verifiable goal. Do not proceed on a "close enough."

### Task E2: Make the repo public and run Phase 0 as a rubric roast

- [ ] Flip `Imasaikiran/bench` to public. (The Phase 0 signal gate in `docs/plans/phase0-signal.md` counts stranger PRs against the repo — structurally impossible while private.)
- [ ] Post the rubric (`rubric/rubric.yaml`) as "roast my Claude Code scoring rubric" to the seed communities: r/ClaudeAI, Anthropic Discord `#claude-code`, and to named amplifiers (Willison, Huntley) directly. "Roast my rubric" is controversy-shaped and travels further than a portrait. One quote-tweet of the rubric outweighs the modeled launch funnel.
- [ ] Record the outcome honestly in `docs/plans/phase0-signal.md`. BUILD only if the signal bar (3+ stranger PRs / 10 substantive comments / 1 unsolicited mention) is met.

### Task E3: Publish npm + deploy web (only after E1 + E2 pass)

- [ ] Run Task 1.38 (npm publish `@imasaikiran/bench@alpha`) and Task 1.39 (launch runbook) from the existing implementation plan. Verify `npx @imasaikiran/bench@alpha --version` from a clean machine.
- [ ] Ship a LinkedIn-proportioned seal/OG variant with achievement framing (India dev culture shares credentials unironically; the tier seal already looks like a LinkedIn achievement graphic). Seed Indian dev Telegram/Discord groups alongside the X thread; time the thread for IST-evening / US-morning overlap.

---

## Self-review

**Spec coverage:** All eight verified root-cause findings map to a task (A1 finding 1; A2 finding 2; A3 finding 3; A4 finding 4; B1–B2 finding 5; C1 finding 6; C2 finding 7; D1 finding 8). Research recommendations mapped: recognition/named-artifacts (B2), founder-mirror gate (E1), terminal-as-artifact (C2), prevalence-not-rank (D1), never-render-zero-as-missing (A4), delta-on-rescan (D2), public repo + rubric roast (E2), LinkedIn/India seed (E3).

**Placeholder scan:** Phase A–C tasks carry complete code. Phase D–E tasks are specified as contracts with test criteria rather than full code because the prevalence table values and the terminal ANSI layout involve founder data/taste decisions that should be made at implementation time, not guessed here; each still has exact files, a failing-test-first step, and a commit. Flag: if executing D1/D2/C2 via subagents, the subagent must write the concrete test first (step 1) before implementation.

**Type consistency:** `normalizeEntry` (A1), `normalizeSkillName` (A2), `sessionConfidence`/`Confidence` (A4), `pickVerbs`/`isKnownVerb` (B1), and the extended `CopyContext` (B2) are used consistently across tasks. Count field names (`skills_total`, `project_root_count`, `sessions_total`, `weeks_on_cc`, `plan_mode_ratio`) match `scanner/index.ts` output.

**Known out-of-scope gaps (do not silently fix):** `avg_bytes_per_read` stays 0 because Claude Code's `Read` tool_use input uses `file_path`, not `bytes_read` — a separate signal-design question. `sessions.ts:191` cwd normalization TODO (dedup of `~/foo` vs `/Users/x/foo`) is pre-existing and untouched.

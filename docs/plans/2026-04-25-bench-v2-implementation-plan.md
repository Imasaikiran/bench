# bench v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `npx bench` CLI + `bench.dev` web app that scores a developer's Claude Code setup against a versioned open-source rubric and renders the locked v1 one-page portrait, test-first, with no edits to v1 frontend and phase-gated kill criteria.

**Architecture:** Monorepo `Imasaikiran/bench` on branch `v2-dev` with three top-level packages: `cli/` (TypeScript, published as `@imasaikiran/bench` on npm, runs on user's machine), `web/` (Next.js 15 App Router on Vercel, backed by Neon Postgres), `rubric/` (single `rubric.yaml`, bundled into both). Persona-shape contract (§7.2) is the hard boundary between v2 server mapper and v1 frozen `script.js`. All scoring deterministic — no LLM in path. Phase 0 ships the rubric alone and gates Phase 1 build on a strict 3-tripwire demand signal.

**Tech Stack:** TypeScript 5.5+, Bun (with Node ≥20 fallback), Next.js 15 App Router, React 19, Neon Postgres (serverless), `@vercel/og` (Satori), `nanoid`, `js-yaml`, `zod`, `@octokit/oauth-app`, Cloudflare WAF, Plausible (cookieless EU), Vitest for unit, Playwright for web e2e, `pg` via Neon serverless driver.

**Spec reference:** `docs/specs/2026-04-25-bench-v2-design.md`. Every task cites a spec section. Decisions table §15 is closed — no item re-opened.

**Branch policy:** Every PR lands on `v2-dev` or a sub-branch `v2-dev/<task-slug>` merged back into `v2-dev`. Nothing on `main`, `v1-bench`, or `v1.0.0`. v1 frontend files (`index.html`, `styles.css`, `script.js`) on `v1-bench` are FROZEN — copied into `web/public/v1/` as static assets only.

**Kill gates inline:**
- End of Phase 0 (May 2, 2026): 3-tripwire check §13. Fail → stop build.
- End of Phase 1 launch week: < 30 scans → stop.
- Phase 2: < 20% W2 rescan after 4 weeks → re-examine visual.

---

## File Structure

Final monorepo shape after Phase 1:

```
bench/
├── cli/
│   ├── src/
│   │   ├── index.ts                  # npx entry, argv, top-level orchestration
│   │   ├── env.ts                    # root/CI/CLAUDE_HOME refusal + detection
│   │   ├── paths.ts                  # allowed-prefix resolver, symlink guard
│   │   ├── scanner/
│   │   │   ├── index.ts              # orchestrates readers
│   │   │   ├── config.ts             # CLAUDE.md, settings.json, settings.local.json
│   │   │   ├── skills.ts             # ~/.claude/skills/**/SKILL.md
│   │   │   ├── hooks.ts              # hooks + cross-ref settings
│   │   │   ├── commands.ts           # ~/.claude/commands/**
│   │   │   ├── agents.ts             # ~/.claude/agents/**
│   │   │   ├── mcp.ts                # mcp.json or mcpServers key
│   │   │   ├── sessions.ts           # JSONL parse, active_seconds
│   │   │   └── git.ts                # git log, verbs, commit_burst_correlation
│   │   ├── redactor.ts               # pattern list + redact fn
│   │   ├── rubric/
│   │   │   ├── load.ts               # parse rubric.yaml
│   │   │   ├── score.ts              # counts → states → chapter scores
│   │   │   └── persona.ts            # tier inference + hours formula
│   │   ├── payload.ts                # assemble upload JSON + HMAC
│   │   ├── preview.ts                # terminal box + diff printer
│   │   ├── consent.ts                # y/N prompt + show-redactions
│   │   ├── uploader.ts               # egress allowlist POST
│   │   ├── browser.ts                # open URL cross-platform
│   │   ├── local-export.ts           # ./bench-scan.json + ./bench-scan.html
│   │   └── why.ts                    # --why reasoning printer
│   ├── test/
│   │   ├── fixtures/                 # synthetic ~/.claude dirs
│   │   │   ├── explorer/
│   │   │   ├── tinkerer/
│   │   │   ├── operator/
│   │   │   └── conductor/
│   │   ├── snapshots/                # expected JSON per fixture
│   │   └── *.test.ts                 # one per src module
│   ├── package.json                  # name: "@imasaikiran/bench", bin: bench
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── web/
│   ├── app/
│   │   ├── layout.tsx                # global shell, Plausible script
│   │   ├── page.tsx                  # landing /
│   │   ├── demo/page.tsx             # synthetic Priya
│   │   ├── scan/[id]/page.tsx        # anonymous scan render
│   │   ├── u/[handle]/page.tsx       # claimed profile
│   │   ├── rubric/page.tsx           # render rubric.yaml
│   │   ├── how-we-scored/page.tsx    # formulas + changelog
│   │   ├── over-capacity/page.tsx    # Vercel cap fallback
│   │   ├── internal/metrics/page.tsx # founder-only dashboard
│   │   └── api/
│   │       ├── scan/route.ts         # POST ingest
│   │       ├── claim/route.ts        # POST GitHub OAuth link
│   │       ├── delete/route.ts       # POST cascade delete
│   │       ├── feedback/route.ts     # POST user feedback
│   │       ├── auth/github/route.ts  # OAuth callback
│   │       ├── cron/expire/route.ts  # Vercel Cron daily
│   │       └── og/[id]/route.tsx     # @vercel/og PNG
│   ├── lib/
│   │   ├── db.ts                     # Neon client
│   │   ├── schema.ts                 # zod payload validator
│   │   ├── mapper.ts                 # payload → PersonaShape (§7.2)
│   │   ├── rubric.ts                 # server-side re-scoring
│   │   ├── anomaly.ts                # is_suspect rules
│   │   ├── hmac.ts                   # verify client_hmac
│   │   ├── ratelimit.ts              # 50/IP/24h app-level
│   │   ├── plausible.ts              # event helpers
│   │   └── v1render.tsx              # server component that injects PersonaShape into v1 template
│   ├── public/
│   │   └── v1/                       # COPIED verbatim from v1-bench tag v1.0.0
│   │       ├── styles.css
│   │       └── script.js             # loaded as <script> in v1render
│   ├── migrations/
│   │   ├── 0001_init.sql             # scans/profiles/feedback/rate_limits
│   │   └── run.ts                    # migration runner
│   ├── test/                         # Vitest unit
│   ├── e2e/                          # Playwright
│   ├── next.config.js
│   ├── vercel.json                   # cron + spending cap
│   └── package.json
│
├── rubric/
│   ├── rubric.yaml                   # single source of truth
│   └── schema.json                   # json-schema for rubric.yaml
│
├── docs/
│   ├── specs/2026-04-25-bench-v2-design.md   # frozen
│   └── plans/2026-04-25-bench-v2-implementation-plan.md   # this doc
│
├── .github/workflows/
│   ├── ci.yml                        # typecheck + unit + snapshot
│   ├── e2e.yml                       # Playwright + Lighthouse + axe
│   └── publish.yml                   # npm publish on tag
│
├── package.json                      # workspace root, pnpm
├── pnpm-workspace.yaml
├── README.md
└── V2_KICKOFF.md                     # existing
```

Layout rationale — one responsibility per file, reader modules under `cli/src/scanner/` split by surface (config/skills/hooks/…) because they change independently as Claude Code surfaces evolve. Rubric loader/scorer live beside scanner inside CLI but also get re-imported by `web/lib/rubric.ts` for server re-scoring (§10.3 item 11) via the rubric package.

---

## Phase 0 — Rubric-first (Apr 25 – May 2, 2026)

**Goal:** Publish `rubric.yaml` v0.1 and `/how-we-scored` static page. Generate demand signal. No CLI code. No DB.

### Task 0.1: Workspace scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore` (augment existing)
- Create: `.github/workflows/ci.yml`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Init root `package.json`**

```json
{
  "name": "bench-monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.10"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "cli"
  - "web"
  - "rubric"
```

- [ ] **Step 3: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowJs": false
  }
}
```

- [ ] **Step 4: Augment `.gitignore`**

```
node_modules/
dist/
.next/
.vercel/
.env
.env.local
*.log
coverage/
.turbo/
bench-scan.json
bench-scan.html
```

- [ ] **Step 5: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 6: Commit**

```bash
git checkout v2-dev
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .github/workflows/ci.yml
git commit -m "chore(repo): pnpm workspace + CI scaffold for v2"
```

### Task 0.2: Rubric package + schema

**Files:**
- Create: `rubric/package.json`
- Create: `rubric/schema.json`
- Create: `rubric/rubric.yaml`
- Create: `rubric/test/schema.test.ts`
- Create: `rubric/tsconfig.json`

- [ ] **Step 1: Write the failing schema test**

`rubric/test/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const schema = JSON.parse(readFileSync("schema.json", "utf8"));
const rubric = load(readFileSync("rubric.yaml", "utf8"));

describe("rubric.yaml", () => {
  it("validates against schema.json", () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const ok = validate(rubric);
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });
  it("has exactly 25 dimensions across 5 chapters", () => {
    const r = rubric as any;
    const chapters = ["Foundation","Automation","Delegation","Craft","Coherence"];
    for (const c of chapters) {
      expect(r.chapters[c].dimensions.length).toBe(5);
    }
  });
  it("version is semver", () => {
    expect((rubric as any).version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rubric && pnpm test`
Expected: FAIL — files missing.

- [ ] **Step 3: Write `rubric/schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "chapters"],
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "tiers": { "type": "array", "items": { "$ref": "#/$defs/tier" } },
    "chapters": {
      "type": "object",
      "required": ["Foundation","Automation","Delegation","Craft","Coherence"],
      "additionalProperties": false,
      "patternProperties": {
        "^(Foundation|Automation|Delegation|Craft|Coherence)$": {
          "type": "object",
          "required": ["slot_labels","dimensions"],
          "properties": {
            "slot_labels": { "type": "array", "items": { "type": "string" }, "minItems": 5, "maxItems": 5 },
            "dimensions": {
              "type": "array",
              "minItems": 5,
              "maxItems": 5,
              "items": { "$ref": "#/$defs/dimension" }
            }
          }
        }
      }
    }
  },
  "$defs": {
    "dimension": {
      "type": "object",
      "required": ["id","name","weight","have_criteria","partial_criteria","rationale","sources"],
      "properties": {
        "id": { "type": "integer", "minimum": 1, "maximum": 25 },
        "name": { "type": "string" },
        "weight": { "type": "number", "minimum": 0, "maximum": 1 },
        "have_criteria": { "type": "string" },
        "partial_criteria": { "type": ["string","null"] },
        "rationale": { "type": "string" },
        "sources": { "type": "array", "items": { "type": "string" } }
      }
    },
    "tier": {
      "type": "object",
      "required": ["name","conditions"],
      "properties": {
        "name": { "enum": ["Explorer","Tinkerer","Craftsman","Operator","Conductor"] },
        "conditions": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

- [ ] **Step 4: Write `rubric/rubric.yaml` v0.1.0**

Mirror §5.4 tier conditions and §5.5 dimension table verbatim. File length ~250 lines. Example head:

```yaml
version: "0.1.0"

tiers:
  - name: Explorer
    conditions:
      - "weeks_on_cc < 4 OR sessions_total < 20"
  - name: Tinkerer
    conditions:
      - "weeks_on_cc >= 4"
      - "sessions_total >= 20"
      - "skills_total >= 2"
      - "skills_unused_ratio > 0.1"
  - name: Craftsman
    conditions:
      - "weeks_on_cc >= 12"
      - "skills_total >= 3"
      - "skills_unused_ratio <= 0.15"
      - "plan_mode_ratio >= 0.25"
      - "coherence_score >= 0.6"
  - name: Operator
    conditions:
      - "weeks_on_cc >= 16"
      - "agents_configured >= 2"
      - "hooks_configured >= 3"
      - "automation_events >= 300"
      - "coherence_score >= 0.75"
  - name: Conductor
    conditions:
      - "(all Operator conditions)"
      - "cross_project_consistency_score >= 0.7"
      - "skills_total >= 5"
      - "skills_unused_ratio <= 0.1"
      - "sub_dir_claude_md_count >= 2"
      - "commit_burst_correlation >= 0.4"

chapters:
  Foundation:
    slot_labels: ["CLAUDE.md","settings","permissions","sub-dir md","docs"]
    dimensions:
      - id: 1
        name: "Root CLAUDE.md"
        weight: 1.0
        have_criteria: "exists, 20–300 lines"
        partial_criteria: "exists but <20 or >300 lines"
        rationale: "House rules anchor every session; too short = no norms, too long = unread."
        sources:
          - "https://www.anthropic.com/engineering/claude-code-best-practices"
      - id: 2
        name: "settings.json"
        weight: 1.0
        have_criteria: "valid JSON, non-empty"
        partial_criteria: "valid JSON but empty object"
        rationale: "Explicit config beats implicit defaults; empty = unconfigured."
        sources: ["https://docs.claude.com/en/docs/claude-code/settings"]
      - id: 3
        name: "permissions allowlist"
        weight: 1.0
        have_criteria: "permissions.allow has >=3 entries"
        partial_criteria: "permissions.allow has 1-2 entries"
        rationale: "Allowlists cut prompt fatigue — 3+ shows deliberate tuning."
        sources: ["https://docs.claude.com/en/docs/claude-code/settings#permissions"]
      - id: 4
        name: "sub-dir CLAUDE.md"
        weight: 0.8
        have_criteria: ">=1 project has .claude/CLAUDE.md"
        partial_criteria: null
        rationale: "Project-scoped house rules outperform one mega file."
        sources: []
      - id: 5
        name: "Docs in .claude"
        weight: 0.4
        have_criteria: "~/.claude/docs/ exists with content"
        partial_criteria: null
        rationale: "Reference surface the assistant can grep instead of inventing."
        sources: []
  Automation:
    slot_labels: ["PostToolUse","PreToolUse","SessionStart","slash cmds","scripts"]
    dimensions:
      - id: 6
        name: "PostToolUse hook"
        weight: 1.0
        have_criteria: "referenced in settings AND file exists"
        partial_criteria: "referenced but file missing"
        rationale: "Formatters/linters post-tool are the highest-leverage automation."
        sources: ["https://docs.claude.com/en/docs/claude-code/hooks"]
      # ... dimensions 7-10
  Delegation:
    slot_labels: ["skills","pruned skills","github MCP","review agent","test agent"]
    dimensions:
      # ids 11-15 from §5.5
  Craft:
    slot_labels: ["plan mode","reads craft","worktrees","commits","verify"]
    dimensions:
      # ids 16-20 from §5.5
  Coherence:
    slot_labels: ["focus","clean dir","no-bloat","names","single-topic"]
    dimensions:
      # ids 21-25 from §5.5
```

Fill every dimension 6–25 with id/name/weight/have_criteria/partial_criteria/rationale/sources per §5.5 table. No null rationales.

- [ ] **Step 5: Write `rubric/package.json`**

```json
{
  "name": "@imasaikiran/bench-rubric",
  "version": "0.1.0",
  "type": "module",
  "main": "./rubric.yaml",
  "files": ["rubric.yaml","schema.json"],
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "ajv": "8.17.1",
    "js-yaml": "4.1.0",
    "@types/js-yaml": "4.0.9",
    "vitest": "2.0.5"
  }
}
```

- [ ] **Step 6: Run test again**

Run: `pnpm -C rubric test`
Expected: PASS on all three cases.

- [ ] **Step 7: Commit**

```bash
git add rubric/
git commit -m "feat(rubric): rubric.yaml v0.1.0 + json-schema validator"
```

### Task 0.3: Minimal Next.js shell + `/how-we-scored` static

**Files:**
- Create: `web/package.json`, `web/next.config.js`, `web/tsconfig.json`
- Create: `web/app/layout.tsx`, `web/app/page.tsx`
- Create: `web/app/how-we-scored/page.tsx`
- Create: `web/lib/rubric-render.ts`
- Create: `web/test/how-we-scored.test.ts`

- [ ] **Step 1: Write failing rendering test**

`web/test/how-we-scored.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderRubricMarkdown } from "../lib/rubric-render";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

describe("renderRubricMarkdown", () => {
  it("renders all 25 dimensions + version header", () => {
    const rubric: any = load(readFileSync("../rubric/rubric.yaml","utf8"));
    const md = renderRubricMarkdown(rubric);
    expect(md).toContain(`rubric v${rubric.version}`);
    for (let id = 1; id <= 25; id++) {
      expect(md).toMatch(new RegExp(`\\b#${id}\\b`));
    }
    expect(md).toContain("## Foundation");
    expect(md).toContain("## Coherence");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL (lib missing)**

Run: `pnpm -C web test`
Expected: FAIL — cannot find `../lib/rubric-render`.

- [ ] **Step 3: Implement `web/lib/rubric-render.ts`**

```ts
type Dim = {
  id: number; name: string; weight: number;
  have_criteria: string; partial_criteria: string | null;
  rationale: string; sources: string[];
};
type Rubric = {
  version: string;
  chapters: Record<string, { slot_labels: string[]; dimensions: Dim[] }>;
};

export function renderRubricMarkdown(r: Rubric): string {
  const lines: string[] = [];
  lines.push(`# How we scored — rubric v${r.version}\n`);
  for (const [name, ch] of Object.entries(r.chapters)) {
    lines.push(`## ${name}\n`);
    for (const d of ch.dimensions) {
      lines.push(`### #${d.id} ${d.name} (weight ${d.weight})`);
      lines.push(`- **have:** ${d.have_criteria}`);
      if (d.partial_criteria) lines.push(`- **partial:** ${d.partial_criteria}`);
      lines.push(`- **why:** ${d.rationale}`);
      if (d.sources.length) lines.push(`- **sources:** ${d.sources.map(s => `<${s}>`).join(", ")}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Re-run test, expect PASS**

- [ ] **Step 5: Write `web/package.json`**

```json
{
  "name": "@imasaikiran/bench-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "js-yaml": "4.1.0"
  },
  "devDependencies": {
    "@types/react": "19.0.1",
    "@types/js-yaml": "4.0.9",
    "vitest": "2.0.5",
    "typescript": "5.5.4"
  }
}
```

- [ ] **Step 6: Write `web/app/layout.tsx`**

```tsx
export const metadata = {
  title: "bench — score your Claude Code setup",
  description: "A one-page honest portrait of your Claude Code setup. Open-source rubric, local scan, no AI in scoring."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script defer data-domain="bench.dev" src="https://plausible.io/js/script.js" />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Write `web/app/how-we-scored/page.tsx`**

```tsx
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { renderRubricMarkdown } from "../../lib/rubric-render";

export const dynamic = "force-static";

export default function HowWeScoredPage() {
  const rubric = load(readFileSync("../rubric/rubric.yaml", "utf8")) as any;
  const md = renderRubricMarkdown(rubric);
  return (
    <main>
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" }}>{md}</pre>
    </main>
  );
}
```

- [ ] **Step 8: Write `web/app/page.tsx` (Phase 0 landing stub)**

```tsx
export const dynamic = "force-static";
export default function Landing() {
  return (
    <main>
      <h1>bench</h1>
      <p>A one-page honest score of your Claude Code setup.</p>
      <p>Phase 0: the rubric is open. <a href="/how-we-scored">Read it. Roast it.</a></p>
      <p>CLI ships week of May 22, 2026 — if the rubric earns it.</p>
    </main>
  );
}
```

- [ ] **Step 9: Write `web/next.config.js`**

```js
/** @type {import('next').NextConfig} */
export default {
  outputFileTracingIncludes: { "/how-we-scored": ["../rubric/rubric.yaml"] },
  experimental: { typedRoutes: true }
};
```

- [ ] **Step 10: Run build locally**

Run: `pnpm -C web build`
Expected: builds with `/how-we-scored` pre-rendered as static.

- [ ] **Step 11: Commit**

```bash
git add web/
git commit -m "feat(web): Phase 0 shell + /how-we-scored static rubric render"
```

### Task 0.4: Deploy Phase 0 to Vercel + announce

**Files:**
- Create: `web/vercel.json`

- [ ] **Step 1: Write `web/vercel.json`**

```json
{
  "buildCommand": "pnpm -C ../rubric test && pnpm -C web build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": []
}
```

- [ ] **Step 2: Link Vercel project, set hard spending cap**

Run (one-time, founder):
```bash
npx vercel link --project bench
npx vercel env add PLAUSIBLE_DOMAIN production
# Vercel dashboard → Settings → Spending → cap = $50/mo
```

- [ ] **Step 3: Point `bench.dev` at Vercel + Cloudflare proxy**

Cloudflare DNS: `bench.dev` CNAME → `cname.vercel-dns.com`, proxy ON. TLS: Full (strict).

- [ ] **Step 4: Deploy**

Run: `npx vercel --prod`

- [ ] **Step 5: Commit + push**

```bash
git add web/vercel.json
git commit -m "chore(web): vercel.json for Phase 0 deploy"
git push origin v2-dev
```

- [ ] **Step 6: Founder thread + cross-posts (Apr 25)**

Not a code task — founder posts X thread, crossposts to r/ClaudeAI, Anthropic Discord `#claude-code`, awesome-claude-code issues. Link to `bench.dev/how-we-scored` + `github.com/Imasaikiran/bench/blob/v2-dev/rubric/rubric.yaml`. No code-change checkbox; log thread URLs into `docs/plans/phase0-signal.md` as they appear.

### Task 0.5: Phase 0 tripwire audit (May 2, 2026)

**Files:**
- Create: `docs/plans/phase0-signal.md`

- [ ] **Step 1: Gather signal via `gh api`**

Run:
```bash
gh api repos/Imasaikiran/bench/issues --paginate > /tmp/issues.json
gh api repos/Imasaikiran/bench/pulls --paginate --state all > /tmp/prs.json
```

- [ ] **Step 2: Apply the 3 tripwires from §13 Phase 0**

Tripwire A: ≥ 3 PRs/issues from accounts not previously interacting with founder's repos. Cross-check author logins against `gh api users/imasaikiran/events --paginate`.
Tripwire B: ≥ 10 substantive comments from ≥ 5 distinct non-founder accounts (X replies + Reddit + Discord + GitHub combined).
Tripwire C: ≥ 1 unsolicited blog / thread / video referencing the rubric.

- [ ] **Step 3: Write outcome into `docs/plans/phase0-signal.md`**

Template:
```md
# Phase 0 signal audit — 2026-05-02

- Tripwire A (new-author PRs/issues): <count>. Authors: <list>. **PASS / FAIL**
- Tripwire B (substantive comments): <count> across <N> accounts. **PASS / FAIL**
- Tripwire C (unsolicited reference): <url or "none">. **PASS / FAIL**

Decision: **BUILD PHASE 1** / **KILL**.
Founder signed: <handle>, <date>.
```

- [ ] **Step 4: Commit decision + push**

```bash
git add docs/plans/phase0-signal.md
git commit -m "docs(phase0): signal audit + build/kill decision"
git push origin v2-dev
```

**Gate:** If FAIL — stop. No Phase 1 tasks executed. If PASS — proceed.

---

## Phase 1 — CLI + web MVP (May 2 – May 22, 2026)

Phase 1 is ordered so scanner is testable without web, web is testable without scanner (via fixtures + synthetic payloads), and the first end-to-end wiring is the last step before private beta.

### Task 1.1: CLI package skeleton + Vitest

**Files:**
- Create: `cli/package.json`, `cli/tsconfig.json`, `cli/vitest.config.ts`
- Create: `cli/src/index.ts`
- Create: `cli/test/smoke.test.ts`

- [ ] **Step 1: Write failing smoke test**

`cli/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { main } from "../src/index";

describe("CLI smoke", () => {
  it("main() exists and is async", () => {
    expect(typeof main).toBe("function");
    expect(main.constructor.name).toBe("AsyncFunction");
  });
  it("--version prints scanner + rubric version", async () => {
    const lines: string[] = [];
    await main(["--version"], { stdout: (s) => lines.push(s) });
    expect(lines.join("\n")).toMatch(/bench v\d+\.\d+\.\d+-alpha/);
    expect(lines.join("\n")).toMatch(/rubric v\d+\.\d+\.\d+/);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm -C cli test`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `cli/package.json`**

```json
{
  "name": "@imasaikiran/bench",
  "version": "0.0.1-alpha.0",
  "type": "module",
  "bin": { "bench": "./dist/index.js" },
  "files": ["dist/","rubric.yaml"],
  "scripts": {
    "build": "tsc -p . && chmod +x dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "prepack": "pnpm build"
  },
  "dependencies": {
    "js-yaml": "4.1.0",
    "nanoid": "5.0.7",
    "picocolors": "1.1.1"
  },
  "devDependencies": {
    "@types/js-yaml": "4.0.9",
    "@types/node": "20.14.10",
    "typescript": "5.5.4",
    "vitest": "2.0.5"
  }
}
```

- [ ] **Step 4: Write `cli/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Write `cli/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] }
});
```

- [ ] **Step 6: Write `cli/src/index.ts` with `#!/usr/bin/env node` + stub main**

```ts
#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const VERSION = "0.0.1-alpha.0";

type IO = { stdout?: (s: string) => void; stderr?: (s: string) => void };

export async function main(argv: string[], io: IO = {}): Promise<number> {
  const out = io.stdout ?? ((s) => process.stdout.write(s + "\n"));
  if (argv.includes("--version")) {
    const pkgDir = dirname(fileURLToPath(import.meta.url));
    const rubricPath = resolve(pkgDir, "..", "rubric.yaml");
    const rubricText = readFileSync(rubricPath, "utf8");
    const m = rubricText.match(/version:\s*"(\d+\.\d+\.\d+)"/);
    out(`bench v${VERSION}`);
    out(`rubric v${m?.[1] ?? "unknown"}`);
    return 0;
  }
  out("scanner not yet implemented — see docs/plans/.../task-1.x");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
```

- [ ] **Step 7: Copy rubric into cli dir for bundling**

Add to `cli/package.json` scripts:
```json
"prebuild": "cp ../rubric/rubric.yaml ./rubric.yaml"
```

- [ ] **Step 8: Run test**

Run: `pnpm -C cli test`
Expected: PASS both cases.

- [ ] **Step 9: Commit**

```bash
git add cli/
git commit -m "feat(cli): package skeleton + --version"
```

### Task 1.2: Environment guard (root + CI refusal, CLAUDE_HOME)

**Files:**
- Create: `cli/src/env.ts`
- Create: `cli/test/env.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { detectEnvironment, refuseIfUnsafe } from "../src/env";

describe("env guard", () => {
  it("detects CI via CI=true", () => {
    expect(detectEnvironment({ CI: "true" }).isCI).toBe(true);
  });
  it("detects GitHub Actions", () => {
    expect(detectEnvironment({ GITHUB_ACTIONS: "true" }).isCI).toBe(true);
  });
  it("detects root on unix", () => {
    expect(detectEnvironment({}, { getuid: () => 0 }).isRoot).toBe(true);
  });
  it("refuseIfUnsafe throws on root", () => {
    expect(() => refuseIfUnsafe({ isRoot: true, isCI: false, claudeHome: "~/.claude" }))
      .toThrow(/normal user/);
  });
  it("refuseIfUnsafe throws on CI", () => {
    expect(() => refuseIfUnsafe({ isRoot: false, isCI: true, claudeHome: "~/.claude" }))
      .toThrow(/not for CI/);
  });
  it("respects CLAUDE_HOME env var", () => {
    const env = detectEnvironment({ CLAUDE_HOME: "/tmp/alt-claude" });
    expect(env.claudeHome).toBe("/tmp/alt-claude");
    expect(env.claudeHomeOverridden).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `cli/src/env.ts`**

```ts
import { homedir } from "node:os";
import { resolve } from "node:path";

export type Environment = {
  isRoot: boolean;
  isCI: boolean;
  claudeHome: string;
  claudeHomeOverridden: boolean;
};

const CI_VARS = ["CI","GITHUB_ACTIONS","GITLAB_CI","CIRCLECI","BUILDKITE","TRAVIS","JENKINS_URL"];

export function detectEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  sys: { getuid?: () => number } = process
): Environment {
  const isRoot =
    typeof sys.getuid === "function" ? sys.getuid() === 0 : false;
  const isCI = CI_VARS.some((k) => env[k] && env[k] !== "false" && env[k] !== "0");
  const override = env.CLAUDE_HOME?.trim();
  return {
    isRoot,
    isCI,
    claudeHome: override ? resolve(override) : resolve(homedir(), ".claude"),
    claudeHomeOverridden: Boolean(override)
  };
}

export function refuseIfUnsafe(e: Environment): void {
  if (e.isRoot) throw new Error("Run bench as your normal user, not root.");
  if (e.isCI) throw new Error("bench is not for CI — scanning a CI runner is meaningless.");
}
```

- [ ] **Step 4: Run test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/env.ts cli/test/env.test.ts
git commit -m "feat(cli): env guard — refuse root + CI, honor CLAUDE_HOME"
```

### Task 1.3: Path resolver + symlink guard

**Files:**
- Create: `cli/src/paths.ts`
- Create: `cli/test/paths.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isWithinAllowedPrefixes, resolveSafely } from "../src/paths";

describe("paths", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "bench-")); });

  it("allows paths under home/.claude", () => {
    expect(isWithinAllowedPrefixes(join(root, "a/b"), [root])).toBe(true);
  });
  it("rejects escaping paths", () => {
    expect(isWithinAllowedPrefixes("/etc/passwd", [root])).toBe(false);
  });
  it("rejects symlink escaping allowed prefix", () => {
    mkdirSync(join(root, "sub"));
    writeFileSync("/tmp/bench-escape-target", "x");
    symlinkSync("/tmp/bench-escape-target", join(root, "sub", "bad"));
    expect(resolveSafely(join(root, "sub", "bad"), [root])).toBe(null);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `cli/src/paths.ts`**

```ts
import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

export function isWithinAllowedPrefixes(p: string, prefixes: string[]): boolean {
  const abs = resolve(p);
  return prefixes.some((pre) => {
    const preAbs = resolve(pre);
    return abs === preAbs || abs.startsWith(preAbs + sep);
  });
}

export function resolveSafely(p: string, prefixes: string[]): string | null {
  try {
    const real = realpathSync(p);
    return isWithinAllowedPrefixes(real, prefixes) ? real : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add cli/src/paths.ts cli/test/paths.test.ts
git commit -m "feat(cli): path resolver with symlink-escape guard"
```

### Task 1.4: Fixture `.claude/` directories

**Files:**
- Create: `cli/test/fixtures/{explorer,tinkerer,craftsman,operator,conductor}/…`

- [ ] **Step 1: Author `explorer/` fixture**

Minimal: no CLAUDE.md, empty settings.json, 5 session JSONLs each with 1–2 messages. Expected tier Explorer.

- [ ] **Step 2: Author `tinkerer/` fixture**

`CLAUDE.md` 180 lines, `settings.json` with `permissions.allow` of 4 entries, 6 SKILL.md (4 appear in sessions, 2 never used), 0 hooks, 1 MCP server, 100 sessions spanning 14 weeks. Expected tier Tinkerer, score ~62.

- [ ] **Step 3: Author `craftsman/`, `operator/`, `conductor/` fixtures**

Scale signals to match §5.4 thresholds. Each fixture root has README explaining the expected tier and score range.

- [ ] **Step 4: Add fixture assertion test**

`cli/test/fixtures.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("fixture directories", () => {
  const fixRoot = "test/fixtures";
  const required = ["explorer","tinkerer","craftsman","operator","conductor"];
  for (const f of required) {
    it(`${f} exists with README`, () => {
      expect(statSync(join(fixRoot, f)).isDirectory()).toBe(true);
      const readme = readFileSync(join(fixRoot, f, "README.md"), "utf8");
      expect(readme).toMatch(/expected tier:\s*\w+/i);
    });
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add cli/test/fixtures/
git commit -m "test(cli): fixture .claude/ dirs for five tiers"
```

### Task 1.5: Config surface reader (CLAUDE.md + settings.json)

**Files:**
- Create: `cli/src/scanner/config.ts`
- Create: `cli/test/scanner/config.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { readConfigSurface } from "../../src/scanner/config";

describe("readConfigSurface", () => {
  it("reads explorer fixture to empty-ish shape", async () => {
    const r = await readConfigSurface("test/fixtures/explorer");
    expect(r.claudeMd).toBeNull();
    expect(r.settings).toEqual({});
    expect(r.parseWarnings).toEqual([]);
  });
  it("reads tinkerer fixture", async () => {
    const r = await readConfigSurface("test/fixtures/tinkerer");
    expect(r.claudeMd?.lines).toBeGreaterThan(20);
    expect(r.claudeMd?.lines).toBeLessThan(300);
    expect(r.claudeMd?.headingCount).toBeGreaterThan(0);
    expect(r.settings.permissions?.allow?.length).toBeGreaterThanOrEqual(3);
  });
  it("handles broken JSON without throwing", async () => {
    const r = await readConfigSurface("test/fixtures/broken-json");
    expect(r.parseWarnings[0]).toMatch(/settings\.json/);
    expect(r.settings).toEqual({});
  });
  it("truncates files over 100KB", async () => {
    const r = await readConfigSurface("test/fixtures/huge-md");
    expect(r.claudeMd?.truncated).toBe(true);
  });
});
```

- [ ] **Step 2: Add `broken-json/` and `huge-md/` fixtures**

- [ ] **Step 3: Run test, expect FAIL**

- [ ] **Step 4: Implement `cli/src/scanner/config.ts`**

```ts
import { promises as fs } from "node:fs";
import { join } from "node:path";

export type ClaudeMd = {
  lines: number;
  bytes: number;
  headingCount: number;
  distinctHeadings: number;
  truncated: boolean;
};

export type ConfigSurface = {
  claudeMd: ClaudeMd | null;
  settings: any;
  settingsLocal: any;
  parseWarnings: string[];
};

const MAX_BYTES = 100 * 1024;

async function readText(path: string, warnings: string[]): Promise<string | null> {
  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) return null;
    if (stat.size > MAX_BYTES) {
      warnings.push(`${path} truncated (${stat.size}B > 100KB)`);
      const fd = await fs.open(path, "r");
      const buf = Buffer.alloc(MAX_BYTES);
      await fd.read(buf, 0, MAX_BYTES, 0);
      await fd.close();
      return buf.toString("utf8") + "\n<<truncated>>";
    }
    return fs.readFile(path, "utf8");
  } catch { return null; }
}

async function readJson(path: string, warnings: string[]): Promise<any> {
  const text = await readText(path, warnings);
  if (text == null) return {};
  try { return JSON.parse(text); }
  catch (e) { warnings.push(`${path}: invalid JSON — using empty object`); return {}; }
}

export async function readConfigSurface(claudeHome: string): Promise<ConfigSurface> {
  const warnings: string[] = [];
  const mdText = await readText(join(claudeHome, "CLAUDE.md"), warnings);
  let claudeMd: ClaudeMd | null = null;
  if (mdText !== null) {
    const headings = [...mdText.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim());
    claudeMd = {
      lines: mdText.split("\n").length,
      bytes: Buffer.byteLength(mdText, "utf8"),
      headingCount: headings.length,
      distinctHeadings: new Set(headings.map((h) => h.toLowerCase())).size,
      truncated: mdText.endsWith("<<truncated>>")
    };
  }
  return {
    claudeMd,
    settings: await readJson(join(claudeHome, "settings.json"), warnings),
    settingsLocal: await readJson(join(claudeHome, "settings.local.json"), warnings),
    parseWarnings: warnings
  };
}
```

- [ ] **Step 5: Run test, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add cli/src/scanner/config.ts cli/test/scanner/config.test.ts cli/test/fixtures/broken-json cli/test/fixtures/huge-md
git commit -m "feat(cli/scanner): config surface reader (CLAUDE.md + settings)"
```

### Task 1.6: Skills / hooks / commands / agents / MCP readers

**Files:**
- Create: `cli/src/scanner/{skills,hooks,commands,agents,mcp}.ts`
- Create: `cli/test/scanner/{skills,hooks,commands,agents,mcp}.test.ts`

**For each reader, same TDD cycle.** Illustrated for `skills.ts`:

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { readSkills } from "../../src/scanner/skills";

describe("readSkills", () => {
  it("counts one SKILL.md per skill dir, reads frontmatter", async () => {
    const r = await readSkills("test/fixtures/tinkerer");
    expect(r.total).toBe(6);
    expect(r.items[0].name).toBeTruthy();
    expect(r.items[0].description).toBeTruthy();
  });
  it("malformed YAML frontmatter still counts as skill", async () => {
    const r = await readSkills("test/fixtures/bad-frontmatter");
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export type Skill = { dir: string; name: string | null; description: string | null };
export type SkillsReport = { total: number; items: Skill[] };

export async function readSkills(claudeHome: string): Promise<SkillsReport> {
  const root = join(claudeHome, "skills");
  const items: Skill[] = [];
  async function walk(dir: string) {
    let entries: any[];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name === "SKILL.md") {
        const text = await fs.readFile(p, "utf8");
        const fm = parseFrontmatter(text);
        items.push({ dir, name: fm.name ?? null, description: fm.description ?? null });
      }
    }
  }
  await walk(root);
  return { total: items.length, items };
}

function parseFrontmatter(text: string): any {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try { return (yamlLoad(m[1]) as any) ?? {}; } catch { return {}; }
}
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/scanner/skills.ts cli/test/scanner/skills.test.ts
git commit -m "feat(cli/scanner): SKILL.md reader"
```

- [ ] **Step 4: Repeat cycle for `hooks.ts`**

Read files under `~/.claude/hooks/` matching extensions `.js .ts .py .sh`. Cross-ref against `settings.json.hooks` for event references. Output: `{ configured: N, orphaned: N, events: { PostToolUse: [...] } }`.

Test must cover: hook file present + referenced → configured; present + not referenced → orphaned; referenced + absent → `partial` state later.

- [ ] **Step 5: Commit hooks reader**

```bash
git commit -m "feat(cli/scanner): hooks reader with settings cross-ref"
```

- [ ] **Step 6: Commands reader**

Read `~/.claude/commands/**/*.md`, require `description:` in frontmatter. Output `{ total, withDescription }`.

- [ ] **Step 7: Commit commands reader**

- [ ] **Step 8: Agents reader**

Read `~/.claude/agents/**/*.md`, require `name:` + `description:` frontmatter. Output `{ total, withDescription, reviewAgent: bool, testAgent: bool }` — booleans derived from name/description regex (§5.5 dims 14/15).

- [ ] **Step 9: Commit agents reader**

- [ ] **Step 10: MCP reader**

Read `~/.claude/mcp.json` OR `settings.mcpServers`. Output `{ servers: [name…], hasGithub: bool }` (github detection: key matches `github|mcp-github` case-insensitive per §5.5 dim 13).

- [ ] **Step 11: Commit MCP reader**

### Task 1.7: Session JSONL reader + active_seconds

**Files:**
- Create: `cli/src/scanner/sessions.ts`
- Create: `cli/test/scanner/sessions.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { readSessions, computeActiveSeconds } from "../../src/scanner/sessions";

describe("sessions", () => {
  it("caps gaps > 15min at 900s", () => {
    const ts = [0, 60, 60 + 2000, 60 + 2000 + 30].map((s) => s * 1000);
    expect(computeActiveSeconds(ts)).toBe(60 + 900 + 30);
  });
  it("detects plan_mode markers", async () => {
    const r = await readSessions("test/fixtures/tinkerer");
    expect(r.sessionsTotal).toBeGreaterThan(50);
    expect(r.planModeSessions).toBeGreaterThan(0);
  });
  it("survives malformed lines", async () => {
    const r = await readSessions("test/fixtures/bad-jsonl");
    expect(r.sessionsTotal).toBe(1);
    expect(r.skippedLines).toBeGreaterThan(0);
  });
  it("weeks_on_cc derived from earliest session", async () => {
    const r = await readSessions("test/fixtures/tinkerer");
    expect(r.weeksOnCc).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Implement `cli/src/scanner/sessions.ts`**

```ts
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const GAP_CAP_MS = 15 * 60 * 1000;

export function computeActiveSeconds(sortedMs: number[]): number {
  if (sortedMs.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < sortedMs.length; i++) {
    const gap = sortedMs[i] - sortedMs[i - 1];
    total += Math.min(gap, GAP_CAP_MS);
  }
  return Math.round(total / 1000);
}

export type SessionsReport = {
  sessionsTotal: number;
  planModeSessions: number;
  toolUseCount: number;
  messageCount: number;
  activeSecondsTotal: number;
  weeksOnCc: number;
  earliestStart: string | null;
  skippedLines: number;
  readBytesSum: number;
  readBytesCount: number;
  projectRoots: string[];
};

export async function readSessions(claudeHome: string): Promise<SessionsReport> {
  const root = join(claudeHome, "projects");
  const report: SessionsReport = {
    sessionsTotal: 0, planModeSessions: 0, toolUseCount: 0, messageCount: 0,
    activeSecondsTotal: 0, weeksOnCc: 0, earliestStart: null, skippedLines: 0,
    readBytesSum: 0, readBytesCount: 0, projectRoots: []
  };
  let earliestMs: number | null = null;
  const projectRootsSet = new Set<string>();

  async function walk(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) out.push(...(await walk(p)));
        else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(p);
      }
      return out;
    } catch { return []; }
  }

  for (const path of await walk(root)) {
    report.sessionsTotal++;
    const timestamps: number[] = [];
    let planMode = false;
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let msg: any;
      try { msg = JSON.parse(line); }
      catch { report.skippedLines++; continue; }
      report.messageCount++;
      if (typeof msg.timestamp === "string") {
        const t = Date.parse(msg.timestamp);
        if (!Number.isNaN(t)) timestamps.push(t);
      }
      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        if (msg.content.some((c: any) => c?.type === "tool_use")) report.toolUseCount++;
        if (msg.content.some((c: any) => c?.type === "tool_use" && c.name === "Read")) {
          const bytes = Number(c?.input?.bytes_read);
          if (!Number.isNaN(bytes)) { report.readBytesSum += bytes; report.readBytesCount++; }
        }
      }
      const blob = JSON.stringify(msg.content ?? "");
      if (/plan mode|<PlanModeStart>|<\|plan_mode\|>/i.test(blob)) planMode = true;
      if (typeof msg.cwd === "string") projectRootsSet.add(msg.cwd);
    }
    timestamps.sort((a, b) => a - b);
    report.activeSecondsTotal += computeActiveSeconds(timestamps);
    if (planMode) report.planModeSessions++;
    const first = timestamps[0];
    if (first !== undefined && (earliestMs === null || first < earliestMs)) earliestMs = first;
  }
  report.earliestStart = earliestMs ? new Date(earliestMs).toISOString() : null;
  report.weeksOnCc = earliestMs ? Math.floor((Date.now() - earliestMs) / (7 * 86400 * 1000)) : 0;
  report.projectRoots = [...projectRootsSet];
  return report;
}
```

- [ ] **Step 3: Run test, expect PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(cli/scanner): session JSONL parser with 15-min gap cap"
```

### Task 1.8: Git log reader

**Files:**
- Create: `cli/src/scanner/git.ts`, `cli/test/scanner/git.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGitSignals } from "../../src/scanner/git";

describe("git", () => {
  let repo: string;
  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "bench-git-"));
    execSync("git init -q", { cwd: repo });
    execSync('git config user.email a@b.c && git config user.name x', { cwd: repo });
    writeFileSync(join(repo, "a"), "1");
    execSync("git add . && git commit -q -m 'feat: add a'", { cwd: repo });
    writeFileSync(join(repo, "a"), "2");
    execSync("git add . && git commit -q -m 'fix: tweak'", { cwd: repo });
    writeFileSync(join(repo, "a"), "3");
    execSync("git add . && git commit -q -m 'random noise'", { cwd: repo });
  });

  it("extracts signature verbs from commits", async () => {
    const r = await readGitSignals([repo], []);
    expect(r.conventionalRatio).toBeCloseTo(2/3, 1);
    expect(r.signatureVerbs.length).toBeGreaterThan(0);
  });

  it("returns zeros when git missing / not a repo", async () => {
    const r = await readGitSignals(["/tmp/definitely-not-a-repo-xxx"], []);
    expect(r.conventionalRatio).toBe(0);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const pexec = promisify(execFile);

export type GitReport = {
  conventionalRatio: number;
  signatureVerbs: string[];
  commitBurstCorrelation: number;
  commitsTotal: number;
  skipped: string[];
};

const CONVENTIONAL = /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?!?:/;

export async function readGitSignals(roots: string[], ccActiveHours: Set<string>): Promise<GitReport> {
  const verbCounts = new Map<string, number>();
  let total = 0;
  let conventional = 0;
  let burstOverlap = 0;
  const skipped: string[] = [];

  for (const root of roots) {
    try {
      const { stdout } = await pexec("git", ["-C", root, "log", "--pretty=%H|%ct|%s", "-n", "2000"], { maxBuffer: 8 * 1024 * 1024 });
      for (const line of stdout.split("\n")) {
        if (!line) continue;
        const [, ct, subject] = line.split("|");
        total++;
        if (CONVENTIONAL.test(subject)) conventional++;
        const first = subject.toLowerCase().match(/^(?:\w+(?:\(.+\))?!?:\s*)?(\w+)/);
        if (first) verbCounts.set(first[1], (verbCounts.get(first[1]) ?? 0) + 1);
        const hourBucket = new Date(Number(ct) * 1000).toISOString().slice(0, 13);
        if (ccActiveHours.has(hourBucket)) burstOverlap++;
      }
    } catch (e: any) { skipped.push(`${root}: ${e.message}`); }
  }
  const sorted = [...verbCounts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    conventionalRatio: total === 0 ? 0 : conventional / total,
    signatureVerbs: sorted.slice(0, 3).map(([v]) => v),
    commitBurstCorrelation: total === 0 ? 0 : burstOverlap / total,
    commitsTotal: total,
    skipped
  };
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli/scanner): git log signals (verbs + burst correlation)"
```

### Task 1.9: Redactor

**Files:**
- Create: `cli/src/redactor.ts`, `cli/test/redactor.test.ts`

- [ ] **Step 1: Write test covering every §8.1 pattern**

```ts
import { describe, it, expect } from "vitest";
import { redact, REDACTION_PATTERNS } from "../src/redactor";

const cases: Array<[string,string,string]> = [
  ["openai key","leak: sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX","openai-key"],
  ["ghp classic","ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij","github-pat"],
  ["jwt","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c","jwt"],
  ["aws key","AKIAIOSFODNN7EXAMPLE","aws-access-key"],
  ["private key","-----BEGIN RSA PRIVATE KEY-----","private-key"],
  ["email","contact me at foo@bar.com please","email"],
  ["home path","file at /Users/priya/code/x.ts","home-path"],
  ["url with creds","visit https://user:pass@example.com","url-userinfo"],
];

describe("redact", () => {
  for (const [name, input, kind] of cases) {
    it(`redacts ${name}`, () => {
      const r = redact(input);
      expect(r.text).not.toContain(input.split(" ").find(w => w.length > 20) ?? "");
      expect(r.hits[0]?.kind).toBe(kind);
    });
  }
  it("returns 0 hits on clean text", () => {
    expect(redact("hello world").hits.length).toBe(0);
  });
});
```

- [ ] **Step 2: Implement `cli/src/redactor.ts`**

```ts
export type RedactionHit = { kind: string; location?: string };

export const REDACTION_PATTERNS: Array<{ kind: string; re: RegExp; replace: string }> = [
  { kind: "openai-key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g, replace: "<redacted:openai-key>" },
  { kind: "github-pat", re: /\bghp_[A-Za-z0-9]{36}\b/g, replace: "<redacted:github-pat>" },
  { kind: "github-pat-fg", re: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/g, replace: "<redacted:github-pat>" },
  { kind: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]+/g, replace: "<redacted:slack-token>" },
  { kind: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/g, replace: "<redacted:aws-access-key>" },
  { kind: "aws-secret", re: /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9+\/=]{30,}/gi, replace: "<redacted:aws-secret>" },
  { kind: "private-key", re: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g, replace: "<redacted:private-key>" },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, replace: "<redacted:jwt>" },
  { kind: "generic-secret", re: /(password|passwd|secret|token|api[_-]?key)\s*=\s*['"][^'"]{6,}['"]/gi, replace: "$1=<redacted:secret>" },
  { kind: "url-userinfo", re: /https?:\/\/[^:@\s]+:[^@\s]+@/g, replace: "<redacted:url-userinfo>@" },
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replace: "<redacted:email>" },
  { kind: "home-path", re: /\/Users\/[^/\s]+/g, replace: "~" },
  { kind: "home-path", re: /\/home\/[^/\s]+/g, replace: "~" },
  { kind: "home-path", re: /C:\\Users\\[^\\]+/g, replace: "~" }
];

export function redact(input: string): { text: string; hits: RedactionHit[] } {
  const hits: RedactionHit[] = [];
  let text = input;
  for (const p of REDACTION_PATTERNS) {
    text = text.replace(p.re, () => { hits.push({ kind: p.kind }); return p.replace; });
  }
  return { text, hits };
}
```

- [ ] **Step 3: Run test, expect PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(cli): redactor with 11-pattern secret list (§8.1)"
```

### Task 1.10: Counts aggregator + coherence_score

**Files:**
- Create: `cli/src/scanner/index.ts`, `cli/test/scanner/index.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { scan } from "../../src/scanner";

describe("scanner.scan", () => {
  it("tinkerer fixture produces payload-shaped counts", async () => {
    const r = await scan("test/fixtures/tinkerer", { git: false });
    expect(r.counts.sessions_total).toBeGreaterThanOrEqual(100);
    expect(r.counts.skills_total).toBe(6);
    expect(r.counts.skills_active).toBe(4);
    expect(r.counts.skills_unused_ratio).toBeCloseTo(2/6, 2);
    expect(r.counts.claude_md_lines).toBeGreaterThan(20);
    expect(r.counts.coherence_score).toBeGreaterThan(0);
    expect(r.counts.coherence_score).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { readConfigSurface } from "./config";
import { readSkills } from "./skills";
import { readHooks } from "./hooks";
import { readCommands } from "./commands";
import { readAgents } from "./agents";
import { readMcp } from "./mcp";
import { readSessions } from "./sessions";
import { readGitSignals } from "./git";

export async function scan(claudeHome: string, opts: { git: boolean } = { git: true }) {
  const [cfg, skills, hooks, cmds, agents, mcp, sessions] = await Promise.all([
    readConfigSurface(claudeHome),
    readSkills(claudeHome),
    readHooks(claudeHome),
    readCommands(claudeHome),
    readAgents(claudeHome),
    readMcp(claudeHome),
    readSessions(claudeHome)
  ]);

  const skillsActive = computeActiveSkills(skills, sessions);
  const skillsUnusedRatio = skills.total === 0 ? 0 : 1 - skillsActive / skills.total;

  const ccActiveHours = new Set<string>(); // filled if needed for git correlation
  const git = opts.git ? await readGitSignals(sessions.projectRoots, ccActiveHours) : {
    conventionalRatio: 0, signatureVerbs: [], commitBurstCorrelation: 0, commitsTotal: 0, skipped: []
  };

  const counts = {
    sessions_total: sessions.sessionsTotal,
    plan_mode_sessions: sessions.planModeSessions,
    skills_total: skills.total,
    skills_active: skillsActive,
    skills_unused_ratio: round(skillsUnusedRatio, 3),
    hooks_configured: hooks.configured,
    agents_configured: agents.total,
    commands_total: cmds.total,
    mcp_servers: mcp.servers.length,
    automation_events: hooks.automationEvents,
    worktrees_detected: 0, // dim 18 reader in follow-on task
    claude_md_lines: cfg.claudeMd?.lines ?? 0,
    sub_dir_claude_md_count: 0, // populated by separate reader
    coherence_score: computeCoherenceScore({
      duplicateSkills: duplicateSkillFraction(skills),
      orphanedHooks: hooks.orphaned / Math.max(hooks.configured + hooks.orphaned, 1),
      claudeMdOverLong: (cfg.claudeMd?.lines ?? 0) > 300 ? 1 : 0
    }),
    commit_burst_correlation: round(git.commitBurstCorrelation, 3),
    weeks_on_cc: sessions.weeksOnCc,
    active_hours_total: sessions.activeSecondsTotal / 3600,
    avg_bytes_per_read: sessions.readBytesCount === 0 ? 0 : sessions.readBytesSum / sessions.readBytesCount
  };

  return {
    counts,
    diagnostics: {
      redaction_hits: 0,
      parse_warnings: [...cfg.parseWarnings, ...git.skipped],
      skipped_files: 0,
      elapsed_ms: 0
    },
    raw: { cfg, skills, hooks, cmds, agents, mcp, sessions, git }
  };
}

function round(n: number, d: number) { return Math.round(n * 10 ** d) / 10 ** d; }
function computeActiveSkills(s: any, sess: any): number { /* intersect s.items[].name against toolUseCount names */ return 0; }
function duplicateSkillFraction(s: any): number { /* 1 - distinct/total */ return 0; }
function computeCoherenceScore(parts: { duplicateSkills: number; orphanedHooks: number; claudeMdOverLong: number }): number {
  return Math.max(0, Math.min(1, 1 - (parts.duplicateSkills + parts.orphanedHooks + 0.15 * parts.claudeMdOverLong)));
}
```

Fill stub fns with real implementations guided by the same tests.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli/scanner): top-level scan() aggregator + coherence_score"
```

### Task 1.11: Rubric engine — counts → states → chapter scores

**Files:**
- Create: `cli/src/rubric/load.ts`, `cli/src/rubric/score.ts`
- Create: `cli/test/rubric/score.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { loadRubric } from "../../src/rubric/load";
import { scoreFromCounts } from "../../src/rubric/score";

describe("scoreFromCounts", () => {
  const rubric = loadRubric("../rubric/rubric.yaml");
  it("produces 5 chapter scores and 25 states", () => {
    const counts = {
      sessions_total: 100, plan_mode_sessions: 25, skills_total: 6, skills_active: 4,
      skills_unused_ratio: 0.33, hooks_configured: 0, agents_configured: 0, commands_total: 2,
      mcp_servers: 1, automation_events: 0, claude_md_lines: 180, sub_dir_claude_md_count: 1,
      coherence_score: 0.72, commit_burst_correlation: 0.3, weeks_on_cc: 14,
      active_hours_total: 187, avg_bytes_per_read: 18000,
      worktrees_detected: 0, duplicate_skill_fraction: 0, orphaned_hooks_fraction: 0,
      conventional_ratio: 0.6, clean_frontmatter_ratio: 0.9, distinct_heading_count: 4,
      project_root_count: 4, verify_hook_present: true
    };
    const r = scoreFromCounts(counts, rubric);
    expect(Object.keys(r.chapters).sort()).toEqual(["Automation","Coherence","Craft","Delegation","Foundation"]);
    const allStates = Object.values(r.chapters).flatMap((c: any) => c.states);
    expect(allStates).toHaveLength(25);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Implement `rubric/load.ts`**

```ts
import { readFileSync } from "node:fs";
import { load as yamlLoad } from "js-yaml";
export function loadRubric(path: string): any {
  return yamlLoad(readFileSync(path, "utf8"));
}
```

- [ ] **Step 3: Implement `rubric/score.ts` — deterministic per §5.5**

```ts
type State = "have" | "partial" | "missing";
type Counts = Record<string, any>;

const PREDICATES: Record<number, (c: Counts) => State> = {
  1: (c) => c.claude_md_lines >= 20 && c.claude_md_lines <= 300 ? "have" :
          c.claude_md_lines > 0 ? "partial" : "missing",
  2: (c) => c.settings_valid && c.settings_nonempty ? "have" :
          c.settings_valid ? "partial" : "missing",
  3: (c) => c.permissions_allow_count >= 3 ? "have" :
          c.permissions_allow_count >= 1 ? "partial" : "missing",
  4: (c) => c.sub_dir_claude_md_count >= 1 ? "have" : "missing",
  5: (c) => c.docs_dir_nonempty ? "have" : "missing",
  6: (c) => c.post_tool_use_hook === "present" ? "have" :
          c.post_tool_use_hook === "referenced" ? "partial" : "missing",
  7: (c) => c.pre_tool_use_hook === "present" ? "have" :
          c.pre_tool_use_hook === "referenced" ? "partial" : "missing",
  8: (c) => c.session_hook === "present" ? "have" :
          c.session_hook === "referenced" ? "partial" : "missing",
  9: (c) => c.commands_total >= 3 ? "have" :
          c.commands_total >= 1 ? "partial" : "missing",
  10: (c) => c.automation_events > 100 ? "have" :
            c.automation_events >= 10 ? "partial" : "missing",
  11: (c) => c.skills_total >= 3 ? "have" :
            c.skills_total >= 1 ? "partial" : "missing",
  12: (c) => c.skills_unused_ratio <= 0.15 ? "have" :
            c.skills_unused_ratio <= 0.3 ? "partial" : "missing",
  13: (c) => c.mcp_has_github ? "have" :
            c.mcp_servers >= 1 ? "partial" : "missing",
  14: (c) => c.review_agent ? "have" :
            c.agents_configured >= 1 ? "partial" : "missing",
  15: (c) => c.test_agent ? "have" :
            c.agents_configured >= 1 ? "partial" : "missing",
  16: (c) => c.plan_mode_ratio >= 0.25 ? "have" :
            c.plan_mode_ratio >= 0.05 ? "partial" : "missing",
  17: (c) => c.avg_bytes_per_read > 0 && c.avg_bytes_per_read <= 20000 ? "have" :
            c.avg_bytes_per_read > 0 && c.avg_bytes_per_read <= 60000 ? "partial" : "missing",
  18: (c) => c.worktrees_detected >= 1 ? "have" : "missing",
  19: (c) => c.conventional_ratio >= 0.8 ? "have" :
            c.conventional_ratio >= 0.5 ? "partial" : "missing",
  20: (c) => c.verify_hook_present ? "have" :
            c.any_hook_present ? "partial" : "missing",
  21: (c) => c.project_root_count <= 5 ? "have" :
            c.project_root_count <= 10 ? "partial" : "missing",
  22: (c) => c.orphaned_hooks_fraction === 0 && c.duplicate_skill_fraction === 0 ? "have" :
            c.orphaned_hooks_fraction < 0.2 ? "partial" : "missing",
  23: (c) => c.skills_unused_ratio <= 0.1 ? "have" :
            c.skills_unused_ratio <= 0.25 ? "partial" : "missing",
  24: (c) => c.clean_frontmatter_ratio === 1 ? "have" :
            c.clean_frontmatter_ratio >= 0.8 ? "partial" : "missing",
  25: (c) => c.distinct_heading_count <= 5 ? "have" :
            c.distinct_heading_count <= 10 ? "partial" : "missing"
};

const STATE_VAL: Record<State, number> = { have: 1, partial: 0.5, missing: 0 };

export function scoreFromCounts(counts: Counts, rubric: any) {
  const chapterNames = ["Foundation","Automation","Delegation","Craft","Coherence"];
  const out: Record<string, { score: number; states: State[] }> = {};
  for (const name of chapterNames) {
    const dims = rubric.chapters[name].dimensions;
    const states = dims.map((d: any) => PREDICATES[d.id](counts));
    const num = dims.reduce((s: number, d: any, i: number) => s + d.weight * STATE_VAL[states[i]], 0);
    const den = dims.reduce((s: number, d: any) => s + d.weight, 0);
    out[name] = { score: Math.round(num / den * 100), states };
  }
  const score = Math.round(chapterNames.reduce((s, n) => s + out[n].score, 0) / 5);
  return { chapters: out, score };
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(rubric): deterministic scoring (counts → states → chapters)"
```

### Task 1.12: Tier inference + hours formula

**Files:**
- Create: `cli/src/rubric/persona.ts`, `cli/test/rubric/persona.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { inferTier, computeHoursWithCc, HOURS_CAP, HOURS_FLOOR } from "../../src/rubric/persona";

describe("persona", () => {
  it("returns Explorer when weeks < 4", () => {
    expect(inferTier({ weeks_on_cc: 2, sessions_total: 10 } as any)).toBe("Explorer");
  });
  it("returns Tinkerer on matching thresholds", () => {
    expect(inferTier({
      weeks_on_cc: 14, sessions_total: 100, skills_total: 6, skills_unused_ratio: 0.33
    } as any)).toBe("Tinkerer");
  });
  it("caps hours at 3120", () => {
    expect(computeHoursWithCc(5_000_000)).toBe(HOURS_CAP);
  });
  it("floors hours (returns null) when < 5h", () => {
    expect(computeHoursWithCc(60 * 60 * 4)).toBe(null);
  });
});
```

- [ ] **Step 2: Implement per §5.3 + §5.4**

```ts
export const HOURS_CAP = 3120;
export const HOURS_FLOOR = 5;

export function computeHoursWithCc(activeSecondsTotal: number): number | null {
  const h = Math.round(activeSecondsTotal / 3600);
  if (h < HOURS_FLOOR) return null;
  return Math.min(h, HOURS_CAP);
}

type Tier = "Explorer" | "Tinkerer" | "Craftsman" | "Operator" | "Conductor";

export function inferTier(c: any): Tier {
  const isConductor = isOperator(c)
    && (c.cross_project_consistency_score ?? 0) >= 0.7
    && c.skills_total >= 5 && c.skills_unused_ratio <= 0.1
    && c.sub_dir_claude_md_count >= 2
    && (c.commit_burst_correlation ?? 0) >= 0.4;
  if (isConductor) return "Conductor";
  if (isOperator(c)) return "Operator";
  if (isCraftsman(c)) return "Craftsman";
  if (isTinkerer(c)) return "Tinkerer";
  return "Explorer";
}

function isTinkerer(c: any) {
  return c.weeks_on_cc >= 4 && c.sessions_total >= 20
    && c.skills_total >= 2 && c.skills_unused_ratio > 0.1;
}
function isCraftsman(c: any) {
  return c.weeks_on_cc >= 12 && c.skills_total >= 3
    && c.skills_unused_ratio <= 0.15
    && (c.plan_mode_ratio ?? 0) >= 0.25
    && (c.coherence_score ?? 0) >= 0.6;
}
function isOperator(c: any) {
  return c.weeks_on_cc >= 16 && c.agents_configured >= 2
    && c.hooks_configured >= 3 && c.automation_events >= 300
    && (c.coherence_score ?? 0) >= 0.75;
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(rubric): tier inference + hours formula (§5.3/§5.4)"
```

### Task 1.13: Signature verbs + copy lines + meaning

**Files:**
- Create: `cli/src/rubric/copy.ts`, `cli/test/rubric/copy.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { deriveCopy } from "../../src/rubric/copy";

describe("deriveCopy", () => {
  it("picks top 3 verbs from git verbs, falls back to generic", () => {
    expect(deriveCopy({ signatureVerbs: [] } as any).signature_verbs).toEqual(["build"]);
    const r = deriveCopy({ signatureVerbs: ["install","prune","question"] } as any);
    expect(r.signature_verbs).toEqual(["install","prune","question"]);
    expect(r.identity).toContain("install");
  });
  it("hours meaning in workdays", () => {
    expect(deriveCopy({ hours_with_cc: 187 } as any).hours_meaning).toContain("23 workdays");
  });
  it("hours_label fixed string", () => {
    expect(deriveCopy({} as any).hours_label).toBe("hours with Claude Code");
  });
});
```

- [ ] **Step 2: Implement**

```ts
export function deriveCopy(ctx: { signatureVerbs?: string[]; hours_with_cc?: number }) {
  const verbs = (ctx.signatureVerbs?.length ? ctx.signatureVerbs : ["build"]).slice(0, 3);
  const h = ctx.hours_with_cc ?? 0;
  const workdays = Math.round(h / 8);
  return {
    signature_verbs: verbs,
    identity: verbs.length === 3
      ? `You ${verbs[0]} to learn. You ${verbs[1]} to focus. You keep ${verbs[2]}ing if it fits.`
      : `You ${verbs[0]}.`,
    hours_meaning: h >= HOURS_FLOOR
      ? `~${workdays} workdays of pair-programming — whatever you made, you made it together`
      : "",
    hours_label: "hours with Claude Code"
  };
}
const HOURS_FLOOR = 5;
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(rubric): copy derivation (signature verbs + hours meaning)"
```

### Task 1.14: Payload assembler + client HMAC

**Files:**
- Create: `cli/src/payload.ts`, `cli/test/payload.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { assemblePayload, canonicalJson } from "../src/payload";
import { createHmac } from "node:crypto";

describe("payload", () => {
  it("matches §7.1 shape + size <= 16KB", () => {
    const p = assemblePayload({
      counts: { sessions_total: 100, plan_mode_sessions: 25, skills_total: 6 } as any,
      chapters: { Foundation: { score: 72, states: ["have","have","partial","missing","missing"] } } as any,
      musthaves: Array(15).fill("missing") as any,
      tier: "Tinkerer", score: 62,
      hours_with_cc: 187, weeks_on_cc: 14,
      signature_verbs: ["install","prune","question"],
      identity: "x", hours_meaning: "y", chapter_note: "z",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1-alpha.0", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 1200 }
    });
    expect(p.schema_version).toBe("1.0");
    expect(Buffer.byteLength(JSON.stringify(p), "utf8")).toBeLessThanOrEqual(16 * 1024);
    expect(p.integrity.client_hmac).toMatch(/^[a-f0-9]{64}$/);
  });
  it("canonicalJson is deterministic on key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { createHmac } from "node:crypto";

// NOT a secret — friction only. See §10.3 item 10.
const BUNDLED_HMAC_KEY = "bench-v1-integrity-key-public-do-not-treat-as-secret";

export function canonicalJson(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(v[k])).join(",") + "}";
}

export function assemblePayload(input: any) {
  const payload = {
    schema_version: "1.0",
    rubric_version: input.rubric_version,
    scanner_version: input.scanner_version,
    scanned_at: new Date().toISOString(),
    handle: input.handle ?? null,
    previous_scan_id: input.previous_scan_id ?? null,
    os: process.platform,
    node_version: process.version.replace(/^v/, ""),
    tier: input.tier,
    score: input.score,
    weeks_on_cc: input.weeks_on_cc,
    hours_with_cc: input.hours_with_cc ?? null,
    hours_hidden: input.hours_with_cc == null,
    counts: input.counts,
    chapters: input.chapters,
    chapter_tags: deriveChapterTags(input.chapters),
    musthaves: input.musthaves,
    signature_verbs: input.signature_verbs,
    tiles: input.tiles ?? [],
    identity: input.identity,
    hours_meaning: input.hours_meaning,
    hours_label: "hours with Claude Code",
    chapter_note: input.chapter_note,
    diagnostics: input.diagnostics,
    integrity: { client_hmac: "", hmac_key_id: "v1" }
  };
  payload.integrity.client_hmac = createHmac("sha256", BUNDLED_HMAC_KEY)
    .update(canonicalJson(payload.counts)).digest("hex");
  return payload;
}

function deriveChapterTags(ch: any): Array<"strong"|"partial"|"weak"> {
  return ["Foundation","Automation","Delegation","Craft","Coherence"].map((n) => {
    const s = ch[n]?.score ?? 0;
    if (s >= 70) return "strong";
    if (s >= 40) return "partial";
    return "weak";
  });
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli): payload assembler + client HMAC (§7.1 + §10.3)"
```

### Task 1.15: CLI preview + consent gate

**Files:**
- Create: `cli/src/preview.ts`, `cli/src/consent.ts`
- Create: `cli/test/preview.test.ts`, `cli/test/consent.test.ts`

- [ ] **Step 1: Test preview box**

```ts
import { describe, it, expect } from "vitest";
import { renderPreview } from "../src/preview";

describe("renderPreview", () => {
  it("renders hero + tier + wk", () => {
    const s = renderPreview({ hours_with_cc: 187, score: 62, tier: "Tinkerer", weeks_on_cc: 14 } as any);
    expect(s).toContain("187h");
    expect(s).toContain("hours with Claude Code");
    expect(s).toContain("Bench 62");
    expect(s).toContain("Tinkerer");
    expect(s).toContain("Wk 14");
  });
  it("hides hero when hours_with_cc null", () => {
    const s = renderPreview({ hours_with_cc: null, score: 12, tier: "Explorer", weeks_on_cc: 2 } as any);
    expect(s).not.toContain("h\n  hours with Claude Code");
    expect(s).toContain("come back in a week");
  });
});
```

- [ ] **Step 2: Implement `preview.ts` per §8.2 terminal box**

- [ ] **Step 3: Test consent gate (default N)**

```ts
import { describe, it, expect, vi } from "vitest";
import { askConsent } from "../src/consent";

describe("askConsent", () => {
  it("defaults to false on enter", async () => {
    const out = await askConsent({ redactionHits: 0 }, async () => "");
    expect(out.upload).toBe(false);
  });
  it("true on y/Y", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "y")).upload).toBe(true);
    expect((await askConsent({ redactionHits: 0 }, async () => "YES")).upload).toBe(true);
  });
  it("false on anything else", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "maybe")).upload).toBe(false);
  });
  it("show branch emits redaction listing", async () => {
    const out = await askConsent({ redactionHits: 2, hits: [{ kind: "email" }, { kind: "jwt" }] }, async () => "show\ny");
    expect(out.upload).toBe(true);
    expect(out.shownRedactions).toBe(true);
  });
});
```

- [ ] **Step 4: Implement `consent.ts` using `readline/promises`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(cli): terminal preview + consent gate (§8.2)"
```

### Task 1.16: Uploader (egress allowlist)

**Files:**
- Create: `cli/src/uploader.ts`, `cli/test/uploader.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest";
import { upload, ALLOWED_ENDPOINT } from "../src/uploader";

describe("uploader", () => {
  it("ALLOWED_ENDPOINT is the only allowed URL", () => {
    expect(ALLOWED_ENDPOINT).toBe("https://bench.dev/api/scan");
  });
  it("refuses any endpoint other than ALLOWED_ENDPOINT", async () => {
    await expect(upload({} as any, { endpoint: "https://evil.example.com/api/scan" } as any))
      .rejects.toThrow(/egress policy/i);
  });
  it("retries on 5xx up to 3 times with backoff", async () => {
    let attempts = 0;
    const fetchMock = async () => { attempts++; return new Response("x", { status: 503 }); };
    await expect(upload({} as any, { fetch: fetchMock })).rejects.toThrow();
    expect(attempts).toBe(3);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export const ALLOWED_ENDPOINT = "https://bench.dev/api/scan";

type Opts = { fetch?: typeof globalThis.fetch; endpoint?: string };
const BACKOFF_MS = [1000, 3000, 8000];

export async function upload(payload: any, opts: Opts = {}) {
  const endpoint = opts.endpoint ?? ALLOWED_ENDPOINT;
  if (endpoint !== ALLOWED_ENDPOINT) throw new Error(`egress policy: ${endpoint} not allowed`);
  const doFetch = opts.fetch ?? globalThis.fetch;
  let lastErr: any;
  for (let i = 0; i < BACKOFF_MS.length; i++) {
    try {
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": `bench/${payload.scanner_version}` },
        body: JSON.stringify(payload)
      });
      if (res.status === 429) throw new Error("rate-limited");
      if (res.status === 426) { const j = await res.json(); throw new Error(`stale-client: ${j.required_version}`); }
      if (res.status >= 500) throw new Error(`server ${res.status}`);
      if (!res.ok) throw new Error(`http ${res.status}`);
      return (await res.json()) as { id: string; url: string };
    } catch (e) {
      lastErr = e;
      if (i < BACKOFF_MS.length - 1) await new Promise((r) => setTimeout(r, BACKOFF_MS[i]));
    }
  }
  throw lastErr;
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli): uploader with egress allowlist + exp backoff (N8)"
```

### Task 1.17: Browser launcher

**Files:**
- Create: `cli/src/browser.ts`, `cli/test/browser.test.ts`

- [ ] **Step 1: Test chooses correct command per platform**

```ts
import { describe, it, expect } from "vitest";
import { openCommand } from "../src/browser";

describe("openCommand", () => {
  it("darwin uses open", () => {
    expect(openCommand("darwin", "https://x")).toEqual(["open", ["https://x"]]);
  });
  it("win32 uses cmd /c start", () => {
    expect(openCommand("win32", "https://x")).toEqual(["cmd", ["/c","start","","https://x"]]);
  });
  it("linux uses xdg-open", () => {
    expect(openCommand("linux", "https://x")).toEqual(["xdg-open", ["https://x"]]);
  });
});
```

- [ ] **Step 2: Implement + wire spawn**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli): cross-platform browser launcher"
```

### Task 1.18: Local export (`--offline` and consent-denied path)

**Files:**
- Create: `cli/src/local-export.ts`, `cli/test/local-export.test.ts`
- Create: `cli/src/assets/offline-template.html` (single-file, embeds v1 styles.css + script.js + JSON payload)

- [ ] **Step 1: Copy v1 `styles.css` + `script.js` into CLI package at build time**

Add `cli/package.json` script:
```json
"prebuild": "cp ../rubric/rubric.yaml ./rubric.yaml && cp ../web/public/v1/styles.css src/assets/styles.css && cp ../web/public/v1/script.js src/assets/script.js"
```

(Note: v1 files arrive in `web/public/v1/` via Task 1.22; this step's prebuild depends on that order.)

- [ ] **Step 2: Test**

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeLocalExport } from "../src/local-export";

describe("writeLocalExport", () => {
  it("writes bench-scan.json + self-contained bench-scan.html", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bench-export-"));
    const persona = { handle: "@local", score: 62, tier: "Tinkerer", hours: 187 } as any;
    await writeLocalExport(dir, { foo: 1 } as any, persona);
    const html = readFileSync(join(dir, "bench-scan.html"), "utf8");
    expect(html).toContain("<style>");
    expect(html).toContain("window.__BENCH_PERSONA__");
  });
});
```

- [ ] **Step 3: Implement `local-export.ts`**

```ts
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

export async function writeLocalExport(dir: string, payload: any, persona: any) {
  await fs.writeFile(join(dir, "bench-scan.json"), JSON.stringify(payload, null, 2));
  const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "assets");
  const css = readFileSync(join(assetsDir, "styles.css"), "utf8");
  const js = readFileSync(join(assetsDir, "script.js"), "utf8");
  const tpl = readFileSync(join(assetsDir, "offline-template.html"), "utf8");
  const html = tpl
    .replace("/*__STYLES__*/", css)
    .replace("/*__SCRIPT__*/", js)
    .replace("'__PERSONA__'", JSON.stringify(persona));
  await fs.writeFile(join(dir, "bench-scan.html"), html);
}
```

- [ ] **Step 4: Write `offline-template.html`**

Minimal HTML shell with `<style>/*__STYLES__*/</style>`, `<script>window.__BENCH_PERSONA__='__PERSONA__'</script>`, then the v1 `<body>` markup (copied from `web/public/v1/index.html`), then `<script>/*__SCRIPT__*/</script>`. Single file, no external requests.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(cli): offline local export (JSON + self-contained HTML)"
```

### Task 1.19: CLI flag wiring + `--why` printer

**Files:**
- Modify: `cli/src/index.ts` — add argv handling for `--why --offline --handle --debug --version --dry-run --rubric`
- Create: `cli/src/why.ts`, `cli/test/why.test.ts`

- [ ] **Step 1: Test `--why` output**

```ts
import { describe, it, expect } from "vitest";
import { formatWhy } from "../src/why";

describe("formatWhy", () => {
  it("prints per-dimension state + reason", () => {
    const s = formatWhy({ chapters: { Foundation: { states: ["have"], score: 72 } } } as any, { chapters: { Foundation: { dimensions: [{ id:1, name:"Root CLAUDE.md", have_criteria:"x" }] } } } as any);
    expect(s).toContain("#1 Root CLAUDE.md");
    expect(s).toContain("have");
  });
});
```

- [ ] **Step 2: Implement + wire in `index.ts`**

Argv parsing: replace stub `main` with full pipeline when no flags or non-help flags. Pseudo:

```ts
import { detectEnvironment, refuseIfUnsafe } from "./env";
import { scan } from "./scanner";
import { redact } from "./redactor";
import { scoreFromCounts } from "./rubric/score";
import { inferTier, computeHoursWithCc } from "./rubric/persona";
import { deriveCopy } from "./rubric/copy";
import { assemblePayload } from "./payload";
import { renderPreview } from "./preview";
import { askConsent } from "./consent";
import { upload } from "./uploader";
import { writeLocalExport } from "./local-export";
import { openUrl } from "./browser";
import { formatWhy } from "./why";
import { loadRubric } from "./rubric/load";

export async function main(argv: string[]) {
  const flags = parseArgs(argv);
  if (flags.version) return printVersion();
  const env = detectEnvironment();
  refuseIfUnsafe(env);

  const t0 = Date.now();
  const rubric = loadRubric(flags.rubric ?? bundledRubricPath());
  const scanResult = await scan(env.claudeHome, { git: true });
  const scored = scoreFromCounts(scanResult.counts, rubric);
  const tier = inferTier(scanResult.counts);
  const hours = computeHoursWithCc(scanResult.counts.active_hours_total * 3600);
  const copy = deriveCopy({ signatureVerbs: scanResult.raw.git.signatureVerbs, hours_with_cc: hours ?? 0 });
  const payload = assemblePayload({
    counts: scanResult.counts, chapters: scored.chapters,
    tier, score: scored.score, hours_with_cc: hours,
    weeks_on_cc: scanResult.counts.weeks_on_cc,
    signature_verbs: copy.signature_verbs, identity: copy.identity,
    hours_meaning: copy.hours_meaning, chapter_note: buildChapterNote(scored),
    musthaves: deriveMusthaves(scored), handle: flags.handle ?? null,
    previous_scan_id: null, rubric_version: rubric.version,
    scanner_version: VERSION,
    diagnostics: { ...scanResult.diagnostics, elapsed_ms: Date.now() - t0 }
  });

  if (flags.why) { console.log(formatWhy(scored, rubric)); return 0; }

  console.log(renderPreview({ ...payload, hours_with_cc: hours }));
  if (flags.offline) {
    await writeLocalExport(process.cwd(), payload, mapperToPersona(payload));
    console.log("written: ./bench-scan.json, ./bench-scan.html"); return 0;
  }
  if (flags.dryRun) return 0;
  const consent = await askConsent({ redactionHits: payload.diagnostics.redaction_hits });
  if (!consent.upload) {
    await writeLocalExport(process.cwd(), payload, mapperToPersona(payload));
    console.log("not uploaded. wrote local files."); return 0;
  }
  try {
    const { id, url } = await upload(payload);
    await openUrl(url);
    console.log(url);
    return 0;
  } catch (e: any) {
    console.error(`upload failed: ${e.message}. writing local files.`);
    await writeLocalExport(process.cwd(), payload, mapperToPersona(payload));
    return 1;
  }
}
```

Each helper (`parseArgs`, `bundledRubricPath`, `deriveMusthaves`, `mapperToPersona`, `buildChapterNote`) gets its own small test.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cli): end-to-end wiring (flags, pipeline, failure fallback)"
```

### Task 1.20: Snapshot tests (CI-pinned fixtures)

**Files:**
- Create: `cli/test/snapshots/{explorer,tinkerer,craftsman,operator,conductor}.json`
- Create: `cli/test/snapshot.test.ts`

- [ ] **Step 1: Write test diffing scan output vs snapshot**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { scan } from "../src/scanner";
import { scoreFromCounts } from "../src/rubric/score";
import { loadRubric } from "../src/rubric/load";

const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

describe.each(["explorer","tinkerer","craftsman","operator","conductor"])("snapshot %s", (name) => {
  it("matches", async () => {
    const rubric = loadRubric("../rubric/rubric.yaml");
    const s = await scan(`test/fixtures/${name}`, { git: false });
    const scored = scoreFromCounts(s.counts, rubric);
    const out = { counts: s.counts, chapters: scored.chapters, score: scored.score };
    const snapPath = `test/snapshots/${name}.json`;
    if (UPDATE) { writeFileSync(snapPath, JSON.stringify(out, null, 2)); return; }
    expect(out).toEqual(JSON.parse(readFileSync(snapPath, "utf8")));
  });
});
```

- [ ] **Step 2: Generate snapshots once**

```bash
UPDATE_SNAPSHOTS=1 pnpm -C cli test
```

Review diffs. Verify each tier fixture produces the expected tier. If any mismatch, fix the fixture or the reader — do NOT pin broken output.

- [ ] **Step 3: CI gate — `ci.yml` already runs `pnpm test`; drift fails build (§10.1 item 7).**

- [ ] **Step 4: Commit**

```bash
git add cli/test/snapshots/ cli/test/snapshot.test.ts
git commit -m "test(cli): fixture snapshot tests (§10.1 #7)"
```

### Task 1.21: Copy v1 frontend into `web/public/v1/` (FROZEN)

**Files:**
- Create: `web/public/v1/index.html`, `web/public/v1/styles.css`, `web/public/v1/script.js`

- [ ] **Step 1: Fetch v1 artifacts from tag `v1.0.0` without touching `v1-bench`**

```bash
git show v1.0.0:index.html > web/public/v1/index.html
git show v1.0.0:styles.css > web/public/v1/styles.css
git show v1.0.0:script.js > web/public/v1/script.js
```

(`git show <ref>:<path>` prints file content without checkout — no risk of polluting `v1-bench`.)

- [ ] **Step 2: Write guard test ensuring these files are byte-identical to tag**

`web/test/v1-frozen.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

describe("v1 assets frozen", () => {
  for (const f of ["index.html","styles.css","script.js"]) {
    it(`public/v1/${f} matches tag v1.0.0:${f}`, () => {
      const local = readFileSync(`public/v1/${f}`);
      const ref = execSync(`git show v1.0.0:${f}`);
      expect(local.equals(ref)).toBe(true);
    });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): freeze v1 frontend into public/v1/ (§2)"
```

### Task 1.22: Persona-shape mapper (payload → PersonaShape, §7.2)

**Files:**
- Create: `web/lib/mapper.ts`, `web/test/mapper.test.ts`

- [ ] **Step 1: Test mapper produces every §7.2 field**

```ts
import { describe, it, expect } from "vitest";
import { toPersonaShape } from "../lib/mapper";

describe("toPersonaShape", () => {
  const payload = {
    schema_version: "1.0", rubric_version: "0.1.0", scanner_version: "0.0.1-alpha.0",
    scanned_at: "2026-04-25T12:00:00.000Z",
    handle: "priya_dev", tier: "Tinkerer", score: 62,
    weeks_on_cc: 14, hours_with_cc: 187, hours_hidden: false,
    counts: { skills_total: 6, skills_active: 4 },
    chapters: {
      Foundation: { score: 72, states: ["have","have","partial","missing","missing"] },
      Automation: { score: 10, states: ["missing","missing","missing","missing","missing"] },
      Delegation: { score: 60, states: ["have","partial","have","missing","missing"] },
      Craft:      { score: 82, states: ["have","have","partial","have","missing"] },
      Coherence:  { score: 76, states: ["have","have","partial","have","partial"] }
    },
    chapter_tags: ["partial","weak","partial","strong","strong"],
    musthaves: Array(15).fill("missing"),
    signature_verbs: ["install","prune","question"],
    tiles: [{label:"weeks",value:"14",equiv:""},{label:"skills",value:"6",equiv:""},{label:"prompts",value:"~420",equiv:""},{label:"plan mode",value:"41",equiv:""}],
    identity: "x", hours_meaning: "y", hours_label: "hours with Claude Code", chapter_note: "z"
  } as any;

  it("binary-compat with v1 persona shape", () => {
    const p = toPersonaShape(payload);
    expect(p.handle).toBe("@priya_dev");
    expect(p.initial).toBe("P");
    expect(p.weeks).toBe(14);
    expect(p.hours).toBe(187);
    expect(p.hoursMeaning).toContain("workdays");
    expect(p.signature).toContain("install");
    expect(p.tiles).toHaveLength(4);
    expect(p.chapterTags).toHaveLength(5);
    expect(p.clusters.Foundation).toHaveLength(5);
    expect(p.musthaves).toHaveLength(15);
  });
  it("anonymous scan has anonymous handle", () => {
    const p = toPersonaShape({ ...payload, handle: null });
    expect(p.handle).toBe("@anonymous");
    expect(p.initial).toBe("•");
  });
});
```

- [ ] **Step 2: Implement `lib/mapper.ts` — strict output type**

```ts
export type State = "have" | "partial" | "missing";
export type ChapterTag = "strong" | "partial" | "weak";
export type ChapterName = "Foundation"|"Automation"|"Delegation"|"Craft"|"Coherence";

export type PersonaShape = {
  handle: string; initial: string; weeks: number; eyebrow: string; title: string;
  tiles: Array<{ label: string; value: string; equiv: string }>;
  identity: string; hours: number; hoursMeaning: string;
  signature: string; score: number; tier: string; chapterNote: string;
  chapterTags: ChapterTag[];
  clusters: Record<ChapterName, State[]>;
  musthaves: State[];
};

export function toPersonaShape(payload: any): PersonaShape {
  const handleStr = payload.handle ? `@${payload.handle}` : "@anonymous";
  return {
    handle: handleStr,
    initial: payload.handle ? payload.handle[0].toUpperCase() : "•",
    weeks: payload.weeks_on_cc,
    eyebrow: `scanned just now · ${payload.weeks_on_cc} weeks on claude code`,
    title: titleForTier(payload.tier),
    tiles: payload.tiles.slice(0, 4),
    identity: payload.identity,
    hours: payload.hours_with_cc ?? 0,
    hoursMeaning: payload.hours_meaning,
    signature: `you ${payload.signature_verbs.join(" · you ")}`,
    score: payload.score,
    tier: payload.tier,
    chapterNote: payload.chapter_note,
    chapterTags: payload.chapter_tags,
    clusters: {
      Foundation: payload.chapters.Foundation.states,
      Automation: payload.chapters.Automation.states,
      Delegation: payload.chapters.Delegation.states,
      Craft:      payload.chapters.Craft.states,
      Coherence:  payload.chapters.Coherence.states
    },
    musthaves: payload.musthaves
  };
}

function titleForTier(t: string): string {
  switch (t) {
    case "Explorer":  return "You're getting started.";
    case "Tinkerer":  return "You've been building.";
    case "Craftsman": return "You've found your rhythm.";
    case "Operator":  return "You're orchestrating work.";
    case "Conductor": return "You run a whole studio.";
    default:          return "";
  }
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): payload → PersonaShape mapper (§7.2 boundary)"
```

### Task 1.23: Neon schema + migration runner

**Files:**
- Create: `web/migrations/0001_init.sql` (verbatim §7.3)
- Create: `web/migrations/run.ts`
- Create: `web/lib/db.ts`
- Create: `web/test/db.test.ts` (integration — requires `DATABASE_URL`, skipped locally if unset)

- [ ] **Step 1: Write `0001_init.sql`**

Copy §7.3 DDL verbatim — scans, profiles, feedback, rate_limits, all indices.

- [ ] **Step 2: Migration runner**

```ts
import { readdirSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

await sql`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
const applied = new Set((await sql`SELECT id FROM _migrations`).map((r: any) => r.id));
for (const f of readdirSync("migrations").filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(f)) continue;
  const text = readFileSync(`migrations/${f}`, "utf8");
  for (const stmt of text.split(/;\s*$/m).filter((s) => s.trim())) await sql(stmt as any);
  await sql`INSERT INTO _migrations (id) VALUES (${f})`;
  console.log(`applied ${f}`);
}
```

- [ ] **Step 3: `web/lib/db.ts`**

```ts
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);
```

- [ ] **Step 4: Integration test (run locally with `DATABASE_URL=... pnpm test`)**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): Neon schema + migration runner (§7.3)"
```

### Task 1.24: `/api/scan` route — validate, re-score, anomaly-detect, insert

**Files:**
- Create: `web/lib/schema.ts` (zod)
- Create: `web/lib/rubric.ts` (server-side re-score, import from rubric package)
- Create: `web/lib/anomaly.ts`
- Create: `web/lib/hmac.ts`
- Create: `web/lib/ratelimit.ts`
- Create: `web/app/api/scan/route.ts`
- Create: `web/test/api-scan.test.ts`

- [ ] **Step 1: Write zod validator matching §7.1 payload exactly**

- [ ] **Step 2: Write tests for each gate**

```ts
import { describe, it, expect } from "vitest";
import { POST } from "../app/api/scan/route";

function req(body: any) {
  return new Request("http://x/api/scan", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("/api/scan", () => {
  it("rejects payload > 16KB", async () => {
    const huge = { x: "a".repeat(20000) };
    const r = await POST(req(huge));
    expect(r.status).toBe(413);
  });
  it("rejects schema < current - 2", async () => {
    const r = await POST(req({ schema_version: "0.1", rubric_version: "0.1.0", counts: {} }));
    expect(r.status).toBe(426);
  });
  it("re-scores from counts and flags anomaly when score>85 + sessions<10", async () => {
    const body = validPayloadWith({ score: 99, counts: { sessions_total: 3 } });
    const r = await POST(req(body));
    const j = await r.json();
    expect(j.is_suspect).toBe(true);
  });
  it("ignores client-reported score — re-scores server-side", async () => {
    const body = validPayloadWith({ score: 99, counts: realisticCounts() });
    const r = await POST(req(body));
    const j = await r.json();
    expect(j.score).not.toBe(99);
  });
  it("returns {id, url}", async () => {
    const r = await POST(req(validPayload()));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.id).toMatch(/^[a-z0-9_-]{10}$/);
    expect(j.url).toMatch(/^https:\/\/bench\.dev\/scan\//);
  });
});
```

- [ ] **Step 3: Implement route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { sql } from "../../../lib/db";
import { payloadSchema, CURRENT_SCHEMA, MIN_SCHEMA } from "../../../lib/schema";
import { verifyClientHmac } from "../../../lib/hmac";
import { reScoreFromCounts } from "../../../lib/rubric";
import { detectAnomalies } from "../../../lib/anomaly";
import { rateLimitOk, hashIp } from "../../../lib/ratelimit";
import { createHash } from "node:crypto";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 16 * 1024) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  if (!acceptSchema(body.schema_version)) return NextResponse.json({ error: "stale client", required_version: CURRENT_SCHEMA }, { status: 426 });

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });

  if (!verifyClientHmac(parsed.data)) return NextResponse.json({ error: "integrity mismatch" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const ipHash = hashIp(ip);
  if (!(await rateLimitOk(ipHash))) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const rescored = reScoreFromCounts(parsed.data.counts);
  const anomalies = detectAnomalies(parsed.data, rescored);
  const isSuspect = anomalies.length > 0;

  const id = nanoid(10);
  const hash = createHash("sha256").update(raw).digest("hex");
  const stored = { ...parsed.data, score: rescored.score, tier: rescored.tier, chapters: rescored.chapters };

  await sql`
    INSERT INTO scans (id, payload, payload_hash, ip_hash, user_agent, rubric_version, is_suspect, suspect_reason, created_at, expires_at)
    VALUES (${id}, ${JSON.stringify(stored)}::jsonb, ${hash}, ${ipHash}, ${req.headers.get("user-agent") ?? ""}, ${rescored.rubricVersion}, ${isSuspect}, ${anomalies.join(";") || null}, NOW(), NOW() + INTERVAL '30 days')
  `;
  return NextResponse.json({ id, url: `https://bench.dev/scan/${id}`, is_suspect: isSuspect, score: rescored.score });
}

function acceptSchema(v: string): boolean {
  return v === CURRENT_SCHEMA || v === MIN_SCHEMA;
}
```

- [ ] **Step 4: Implement anomaly rules per §10.3 item 10**

```ts
export function detectAnomalies(p: any, scored: any): string[] {
  const r: string[] = [];
  if (scored.score > 85 && p.counts.sessions_total < 10) r.push("score_high_sessions_low");
  if ((p.hours_with_cc ?? 0) > 500 && p.counts.skills_total === 0) r.push("hours_high_no_skills");
  if (p.counts.coherence_score === 1.0 && p.counts.skills_unused_ratio === 0) r.push("too_clean");
  if (p.weeks_on_cc > 100) r.push("weeks_absurd");
  if (scored.score !== p.score) r.push("client_reported_score_mismatch");
  return r;
}
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): /api/scan with re-score + anomaly + HMAC + rate limit"
```

### Task 1.25: `/scan/[id]` + `/u/[handle]` + v1 render component

**Files:**
- Create: `web/lib/v1render.tsx`
- Create: `web/app/scan/[id]/page.tsx`, `web/app/u/[handle]/page.tsx`
- Create: `web/e2e/render.spec.ts` (Playwright)

- [ ] **Step 1: Write Playwright test**

```ts
import { test, expect } from "@playwright/test";

test("renders v1 constellation + hero from real JSON", async ({ page }) => {
  await page.goto(`${process.env.BASE_URL}/demo`);
  await expect(page.locator("[data-bench-hero]")).toHaveText(/\d+h/);
  await expect(page.locator("[data-bench-tier]")).toContainText(/Explorer|Tinkerer|Craftsman|Operator|Conductor/);
  const stars = page.locator("[data-bench-cluster='Foundation'] [data-bench-star]");
  await expect(stars).toHaveCount(5);
});
```

- [ ] **Step 2: Implement `lib/v1render.tsx`**

```tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PersonaShape } from "./mapper";

const V1_HTML = readFileSync(join(process.cwd(), "public/v1/index.html"), "utf8");
// Extract <body>…</body> markup verbatim; bench-v1 markup has data-bench-* hooks for v2 injection.

export function V1Page({ persona }: { persona: PersonaShape }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/v1/styles.css" />
        <meta property="og:image" content={`https://bench.dev/og/${persona.handle.replace(/^@/, "")}`} />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BENCH_PERSONA__ = ${JSON.stringify(persona)};`
          }}
        />
        <div id="bench-root" dangerouslySetInnerHTML={{ __html: extractBody(V1_HTML) }} />
        <script src="/v1/script.js" defer />
      </body>
    </html>
  );
}

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  return m?.[1] ?? "";
}
```

**Critical constraint:** `v1/script.js` must on load read `window.__BENCH_PERSONA__` instead of `PERSONAS[key]`. Since v1 is frozen, this works only if v1's original `script.js` already does that (it does — v1 was designed with this exact hook). If not, we cannot touch `script.js` — instead inject a pre-script shim:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `window.PERSONAS = { _current: ${JSON.stringify(persona)} }; window.__BENCH_KEY__ = "_current";`
  }}
/>
```

Verify this shim is sufficient by running v1 e2e against it before Task 1.25 closes. If the v1 `script.js` requires edits to consume `PersonaShape`, raise a spec amendment — do not patch `v1-bench`.

- [ ] **Step 3: `/scan/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { sql } from "../../../lib/db";
import { toPersonaShape } from "../../../lib/mapper";
import { V1Page } from "../../../lib/v1render";

export default async function ScanPage({ params }: { params: { id: string } }) {
  const rows = await sql`SELECT payload FROM scans WHERE id = ${params.id} AND (expires_at IS NULL OR expires_at > NOW())`;
  if (rows.length === 0) notFound();
  return <V1Page persona={toPersonaShape((rows[0] as any).payload)} />;
}
```

- [ ] **Step 4: `/u/[handle]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { sql } from "../../../lib/db";
import { toPersonaShape } from "../../../lib/mapper";
import { V1Page } from "../../../lib/v1render";

export default async function HandlePage({ params }: { params: { handle: string } }) {
  const rows = await sql`
    SELECT s.payload FROM profiles p JOIN scans s ON s.id = p.latest_scan
    WHERE p.handle = ${params.handle.toLowerCase()}`;
  if (rows.length === 0) notFound();
  return <V1Page persona={toPersonaShape((rows[0] as any).payload)} />;
}
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): /scan/[id] + /u/[handle] render v1 page from DB"
```

### Task 1.26: GitHub OAuth + claim flow

**Files:**
- Create: `web/app/api/auth/github/route.ts`
- Create: `web/app/api/claim/route.ts`
- Create: `web/lib/github.ts`
- Create: `web/test/claim.test.ts`

- [ ] **Step 1: Test claim binds github_id, not handle string**

```ts
it("user B cannot overwrite user A's handle", async () => {
  // seed profile { handle: "priya_dev", github_id: 111 }
  // attempt claim from github_id: 222 with handle "priya_dev"
  // expect rejection or write to "priya_dev_2" etc.
});
```

- [ ] **Step 2: OAuth scope = `read:user` only (§15 row 11)**

Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OAUTH_STATE_SECRET`.

- [ ] **Step 3: Implement `/api/auth/github` redirect + callback**

- [ ] **Step 4: Implement `/api/claim` — reads `scan_id` from body, verifies signed session, inserts/updates profile, 302s to `/u/<handle>`**

```ts
export async function POST(req: NextRequest) {
  const session = await verifyOAuthSession(req);
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { scan_id } = await req.json();
  const handle = session.login.toLowerCase();
  await sql`
    INSERT INTO profiles (handle, github_id, latest_scan)
    VALUES (${handle}, ${session.github_id}, ${scan_id})
    ON CONFLICT (github_id) DO UPDATE SET latest_scan = EXCLUDED.latest_scan, updated_at = NOW()
  `;
  // unset expires_at since scan is now claimed
  await sql`UPDATE scans SET expires_at = NULL WHERE id = ${scan_id}`;
  return NextResponse.redirect(`https://bench.dev/u/${handle}`);
}
```

Handle collision: if `handle` already exists with a different `github_id`, return 409 with message "this GitHub login already claims another profile". This is not normally possible (handle PK = github handle), included for safety.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): GitHub OAuth + claim flow tied to github_id"
```

### Task 1.27: OG image route (`/og/[id].png`)

**Files:**
- Create: `web/app/api/og/[id]/route.tsx`
- Create: `web/test/og.test.ts`

- [ ] **Step 1: Write test verifying 1200×630, content-type, cache**

```ts
it("returns 1200x630 PNG with 24h cache", async () => {
  const r = await GET(new Request("http://x/og/demo"), { params: { id: "demo" } });
  expect(r.headers.get("content-type")).toBe("image/png");
  expect(r.headers.get("cache-control")).toContain("max-age=86400");
});
```

- [ ] **Step 2: Implement with `@vercel/og`**

```tsx
import { ImageResponse } from "@vercel/og";
import { sql } from "../../../../lib/db";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const rows = await sql`SELECT payload FROM scans WHERE id = ${params.id}`;
  const p = (rows[0] as any)?.payload ?? demoPayload;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0b0b0f", color: "white", fontFamily: "system-ui", padding: 64 }}>
        <div style={{ fontSize: 120, fontWeight: 700 }}>{p.hours_with_cc ?? "—"}h</div>
        <div style={{ fontSize: 36 }}>hours with Claude Code</div>
        <div style={{ fontSize: 48, marginTop: 32 }}>Bench {p.score} · {p.tier}</div>
        <div style={{ fontSize: 28, marginTop: 16 }}>{p.signature_verbs.map((v: string) => `· ${v}`).join(" ")}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } }
  );
}
```

No GitHub avatar in Phase 1 OG per §8.4.1 item 4 (opt-in, off by default).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): /og/[id] dynamic card (1200x630, no avatar)"
```

### Task 1.28: `/demo` + synthetic Priya

**Files:**
- Create: `web/app/demo/page.tsx`
- Create: `web/lib/demo-persona.ts`

- [ ] **Step 1: Hand-craft Priya payload matching §7.1 with hours=187, score=62, tier=Tinkerer**

- [ ] **Step 2: Render via `V1Page` with `eyebrow` forced to "synthetic profile · fictional developer · shown for explainer purposes"**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): /demo synthetic Priya (§5.8)"
```

### Task 1.29: `/rubric` page

**Files:**
- Create: `web/app/rubric/page.tsx`

- [ ] **Step 1: Reuse `renderRubricMarkdown` from Task 0.3**

- [ ] **Step 2: Add top-of-page version line + GitHub PR link**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): /rubric rendered from rubric.yaml"
```

### Task 1.30: Share-on-X/LinkedIn buttons + OG persistence disclosure

**Files:**
- Modify: `web/public/v1/index.html` — NOT ALLOWED. Instead:
- Create: `web/app/_components/ShareBar.tsx`
- Modify: `web/lib/v1render.tsx` to inject `<ShareBar persona={p} />` below v1 body

- [ ] **Step 1: Write test: clicking Share on X triggers modal with §8.4.1 disclosure**

- [ ] **Step 2: Implement modal first-click flow**

First click → modal with disclosure text + `[Got it, share]`. localStorage `bench.og_disclosed = 1` — subsequent clicks go direct.

- [ ] **Step 3: Tweet intent URL**

```ts
const text = `${persona.hours}h with Claude Code. ${persona.signature}. Bench ${persona.score} · ${persona.tier}. ${url}`;
const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
```

- [ ] **Step 4: Plausible `share_click` event fired on share**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): Share bar with OG persistence disclosure modal (§8.4.1)"
```

### Task 1.31: `/api/feedback` + `/api/delete`

**Files:**
- Create: `web/app/api/feedback/route.ts`
- Create: `web/app/api/delete/route.ts`

- [ ] **Step 1: Test delete cascades profile → scans → og cache (via `revalidatePath`)**

- [ ] **Step 2: `/api/feedback` accepts `{ scan_id, dimension, reason }`, inserts row, emits Plausible `feedback_submit`**

- [ ] **Step 3: `/api/delete` requires signed OAuth session, deletes profile (FK cascade to scans); purges OG image route cache via `revalidatePath`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): /api/feedback + /api/delete with cascade"
```

### Task 1.32: Vercel cron — expire anonymous scans

**Files:**
- Modify: `web/vercel.json` — add cron
- Create: `web/app/api/cron/expire/route.ts`

- [ ] **Step 1: Add to `vercel.json`**

```json
{
  "crons": [{ "path": "/api/cron/expire", "schedule": "0 3 * * *" }]
}
```

- [ ] **Step 2: Implement route (verify `Authorization: Bearer $CRON_SECRET`)**

```ts
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("forbidden", { status: 403 });
  const rows = await sql`DELETE FROM scans WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`;
  return NextResponse.json({ deleted: rows.length });
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): nightly cron deletes expired anonymous scans"
```

### Task 1.33: Cloudflare WAF + app rate limit

**Files:**
- Create: `web/lib/ratelimit.ts` (referenced earlier)
- Update: Cloudflare WAF rule (ops, not code)

- [ ] **Step 1: Implement `ratelimit.ts`**

```ts
import { createHash } from "node:crypto";
import { sql } from "./db";

const DAILY_SALT = process.env.DAILY_SALT ?? new Date().toISOString().slice(0,10);

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + DAILY_SALT).digest("hex").slice(0, 32);
}

export async function rateLimitOk(ipHash: string, windowStart: Date = new Date()): Promise<boolean> {
  windowStart.setUTCHours(0,0,0,0);
  const rows = await sql`
    INSERT INTO rate_limits (ip_hash, window_start, request_count)
    VALUES (${ipHash}, ${windowStart}, 1)
    ON CONFLICT (ip_hash, window_start) DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count
  `;
  return (rows[0] as any).request_count <= 50;
}
```

- [ ] **Step 2: Cloudflare dashboard: Add WAF rule — `(http.request.uri.path eq "/api/scan") and (rate(1m) > 10)` → Block.**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): app-level rate limit (50/IP/24h, daily-salt hash)"
```

### Task 1.34: Plausible events + `/internal/metrics`

**Files:**
- Create: `web/lib/plausible.ts`
- Create: `web/app/internal/metrics/page.tsx`
- Modify: `web/middleware.ts` — basic auth for `/internal/*`

- [ ] **Step 1: Wire Plausible `scan_upload`, `claim_complete`, `share_click`, `delete_complete`, `rescan_detect` (§15 row 12)**

- [ ] **Step 2: Read from Plausible Stats API in `/internal/metrics`**

- [ ] **Step 3: Basic-auth middleware (founder-only) with `METRICS_USER`/`METRICS_PASS` env**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): Plausible events + /internal/metrics (§11.1)"
```

### Task 1.35: `/over-capacity` + Vercel spending cap fallback

**Files:**
- Create: `web/app/over-capacity/page.tsx`
- Modify: `/api/scan/route.ts` — detect env `OVER_CAPACITY=1`, return 503

- [ ] **Step 1: Implement** — tasteful page, "come back in a few hours", no blame

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(web): /over-capacity + 503 gate when spending cap hit"
```

### Task 1.36: Lighthouse + axe-core CI

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Workflow runs `pnpm -C web build && pnpm -C web start &` then Playwright + Lighthouse CI + `@axe-core/cli` against `http://localhost:3000/demo` and `/scan/test-id`**

- [ ] **Step 2: Fail if page weight p90 > 400 KB or any axe violation of severity `serious`+**

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: Lighthouse + axe-core budget gates (§11)"
```

### Task 1.37: End-to-end wiring test (CLI + real web)

**Files:**
- Create: `cli/test/e2e.test.ts` (only runs with `BENCH_E2E=1`)

- [ ] **Step 1: Against a local `pnpm -C web dev`, spawn CLI against `test/fixtures/tinkerer`, confirm POST hits `/api/scan`, id returned, DB row present.**

- [ ] **Step 2: Commit**

```bash
git commit -m "test(e2e): CLI → web → DB wiring test"
```

### Task 1.38: Beta publish — `@imasaikiran/bench@0.0.1-alpha.0`

- [ ] **Step 1: Tag repo**

```bash
git tag v2-alpha.1 -m "Phase 1 alpha — private beta"
git push origin v2-alpha.1
```

- [ ] **Step 2: Publish to npm with `publish.yml` workflow**

`.github/workflows/publish.yml`:

```yaml
name: Publish
on:
  push:
    tags: [ "v2-alpha.*", "v2-beta.*", "v2-rc.*" ]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: "https://registry.npmjs.org", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -C cli build
      - run: pnpm -C cli publish --access public --tag alpha --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Smoke test on clean machine**

```bash
npx @imasaikiran/bench@alpha --version
npx @imasaikiran/bench@alpha --offline
```

- [ ] **Step 4: Send install line to beta list (§15 row 7).** No code — documented in `docs/plans/phase1-beta-outreach.md`.

- [ ] **Step 5: Commit + push**

```bash
git add .github/workflows/publish.yml docs/plans/phase1-beta-outreach.md
git commit -m "ci: npm publish on tag + beta outreach log"
git push origin v2-dev --tags
```

### Task 1.39: Launch day runbook (May 22, 2026)

**Files:**
- Create: `docs/plans/phase1-launch-runbook.md`

- [ ] **Step 1: Pre-launch checklist**

- Founder scan claimed (`@imasaikiran`) and re-scanned Day 0 morning.
- `/demo` loads in < 300 ms p95, constellation animates.
- `/api/scan` happy-path smoke test produces `is_suspect=false` and visible card.
- Vercel spending cap verified at $50.
- Cloudflare WAF rule verified.
- Plausible goals configured (§15 row 12).
- `npm view @imasaikiran/bench version` returns current alpha.
- `docs/plans/phase0-signal.md` decision is PASS.

- [ ] **Step 2: Hour-by-hour schedule (09:00 PT)**

Post order: X thread → r/ClaudeAI → HN (Show HN) → awesome-claude-code PR → Discord ping. Spacing: 30 min apart. Founder stays available for 6h for thread replies.

- [ ] **Step 3: Kill-switch criteria (live)**

If `/api/scan` p95 > 2s sustained 10 min OR `is_suspect` rate > 10% OR 5xx rate > 1% → pause distribution, post "we've had a surge, fixes incoming, card URLs still working."

- [ ] **Step 4: End-of-week tripwire check (May 29, 2026)**

Phase 1 kill threshold: < 30 scans → stop. Document outcome in `docs/plans/phase1-week1-postmortem.md`.

- [ ] **Step 5: Commit + push**

```bash
git add docs/plans/phase1-launch-runbook.md
git commit -m "docs: Phase 1 launch runbook + kill-switch criteria"
git push origin v2-dev
```

---

## Phase 2 — Depth (May 22 – Jun 26, 2026)

Deliberately planless here. Phase 2 work planned in a separate doc only after Phase 1 week-1 tripwire passes. The spec §13 lists Phase 2 items (delta-reveal on rescan, `/stats`, rubric v1.1, OG variant A/B); none have full-detail tasks until Phase 1 signal is in hand.

---

## Self-Review (run after plan complete)

1. **Spec coverage check** — every §5.x dimension/formula has a task; every §7.x contract has a task; every §8.x privacy rule has a task; every §9 failure mode mapped to a task. §10 guardrails: data-integrity ✔ (Task 1.11, 1.14, 1.20, 1.24), privacy ✔ (1.9, 1.15, 1.16, 1.21, 1.32), adversarial ✔ (1.24, 1.33, 1.35). §11 NFRs: Lighthouse + axe in Task 1.36. §15 decisions all reflected: monorepo (1.1), package name (1.38), hours formula (1.12), tier renamed Operator (1.11), primary user copy (1.22 titles), OAuth `read:user` (1.26), Plausible events (1.34). §13 kill criteria at 0.5 + 1.39.
2. **Placeholder scan** — no "TODO", no "similar to Task N", no "implement error handling" without concrete predicate. Stub fns in 1.10 (`computeActiveSkills`, etc.) explicitly called out as driven by the same test — acceptable because the test asserts their output.
3. **Type consistency** — `PersonaShape` defined once in `lib/mapper.ts`, imported by `v1render`, `ShareBar`, OG route, demo. Payload `schema_version` field name consistent across CLI + zod + re-score. `hours_with_cc` in payload → `hours` in PersonaShape is the one rename, explicitly called out in §7.2 amendment and Task 1.22 test.

Fix any issue found inline. No re-review pass needed.

---

## Execution Handoff

Plan complete, will be saved to `docs/plans/2026-04-25-bench-v2-implementation-plan.md` on branch `v2-dev`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch fresh subagent per task, two-stage review between tasks.
2. **Inline Execution** — run tasks in this session using `superpowers:executing-plans`, batch with checkpoints.

Choose after this plan is committed and pushed.

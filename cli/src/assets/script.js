/* =========================================================
   atelier · v0.3
   Minimalist, one-artifact flex. Less prose.
   ========================================================= */

const CLUSTER_FRAME = [
  { name: 'Foundation', cx: 150, cy: 140, star_offsets: [[-40,-30],[20,-40],[50,10],[-20,30],[10,50]] },
  { name: 'Automation', cx: 420, cy: 130, star_offsets: [[-30,-30],[20,-40],[40,0],[0,30],[-30,40]] },
  { name: 'Delegation', cx: 700, cy: 140, star_offsets: [[-40,-30],[10,-40],[40,10],[-20,40],[20,50]] },
  { name: 'Craft',      cx: 270, cy: 400, star_offsets: [[-30,-30],[30,-40],[40,10],[-20,30],[10,40]] },
  { name: 'Hygiene',    cx: 580, cy: 410, star_offsets: [[-30,-30],[30,-40],[40,10],[-20,30],[20,40]] },
];

const CLUSTER_LABELS = {
  Foundation: ['CLAUDE.md','settings','permissions','sub-dir md','docs'],
  Automation: ['PostToolUse','PreToolUse','SessionStart','slash cmds','scripts'],
  Delegation: ['skills','pruned skills','github MCP','review agent','test agent'],
  Craft:      ['plan mode','reads craft','worktrees','commits','verify'],
  Hygiene:    ['focus','clean dir','no-bloat','names','single-topic'],
};

const CHAPTER_META = [
  { num: 'I',   name: 'Foundation' },
  { num: 'II',  name: 'Automation' },
  { num: 'III', name: 'Delegation' },
  { num: 'IV',  name: 'Craft' },
  { num: 'V',   name: 'Hygiene' },
];

/* =========================================================
   PERSONAS - terse, each with a flex
   ========================================================= */
const PERSONAS = {

  sam: {
    handle: '@sam_codes', initial: 'S', weeks: 3,
    eyebrow: 'scanned just now · 3 weeks on claude code',
    title: "You've started.",
    tiles: [
      { label: 'weeks',     value: '3',  equiv: 'past week-one hesitation' },
      { label: 'claude.md', value: '32', equiv: 'lines · plain english' },
      { label: 'skills',    value: '2',  equiv: 'both in use, no bloat' },
      { label: 'plan mode', value: '4',  equiv: 'runs · ritual forming' },
    ],
    identity: "You opened the door. Rearranging the furniture comes later. That's the right order.",
    hours: 18, hoursMeaning: 'two workdays you took back, a long weekend',
    signature: 'you ask · you try · you read',
    score: 28, tier: 'Explorer',
    chapterNote: "Your <em>Foundation</em> is lit. The rest is weeks from now, not work.",
    chapterTags: ['strong', 'weak', 'weak', 'partial', 'strong'],
    clusters: {
      Foundation: ['have','partial','missing','missing','missing'],
      Automation: ['missing','missing','missing','missing','missing'],
      Delegation: ['partial','have','missing','missing','missing'],
      Craft:      ['have','partial','missing','missing','missing'],
      Hygiene:    ['have','have','have','partial','missing'],
    },
    musthaves: ['have','partial','missing','missing','missing','missing','missing','missing','partial','missing','missing','have','missing','missing','have'],
  },

  priya: {
    handle: '@priya_dev', initial: 'P', weeks: 14,
    eyebrow: 'scanned just now · 14 weeks on claude code',
    title: "You've been building.",
    tiles: [
      { label: 'weeks',     value: '14',    equiv: 'past the honeymoon' },
      { label: 'skills',    value: '6',     equiv: '4 daily · 3 overlap' },
      { label: 'prompts',   value: '~420',  equiv: 'saved per month' },
      { label: 'plan mode', value: '41',    equiv: 'runs · every other task' },
    ],
    identity: "You install to learn. You prune to focus. You keep asking if it fits.",
    hours: 187, hoursMeaning: 'a full sprint back: 23 workdays, or a side-project shipped',
    signature: 'you install · you prune · you question',
    score: 62, tier: 'Tinkerer',
    chapterNote: "<em>Automation</em> is dark. That's the fastest lever you have.",
    chapterTags: ['partial', 'weak', 'partial', 'strong', 'strong'],
    clusters: {
      Foundation: ['have','have','partial','missing','missing'],
      Automation: ['missing','missing','missing','missing','missing'],
      Delegation: ['have','partial','have','missing','missing'],
      Craft:      ['have','have','partial','have','missing'],
      Hygiene:    ['have','have','partial','have','partial'],
    },
    musthaves: ['have','partial','missing','missing','missing','missing','missing','have','partial','missing','missing','have','partial','missing','missing'],
  },

  maya: {
    handle: '@maya_rose', initial: 'M', weeks: 26,
    eyebrow: 'scanned just now · 26 weeks on claude code',
    title: "You've honed your craft.",
    tiles: [
      { label: 'weeks',     value: '26',  equiv: 'full season in' },
      { label: 'claude.md', value: '147', equiv: 'lines · root + 4 overrides' },
      { label: 'skills',    value: '5',   equiv: 'all used · zero overlap' },
      { label: 'worktrees', value: '14',  equiv: 'parallel, no collisions' },
    ],
    identity: "Your craft is deliberate. Your tooling hasn't caught up yet.",
    hours: 412, hoursMeaning: 'ten weeks of focus, enough to write the book everyone says you should write',
    signature: 'you shape · you test · you refine',
    score: 74, tier: 'Craftsman',
    chapterNote: "Four strong chapters. <em>Automation</em> is the visible gap.",
    chapterTags: ['strong', 'weak', 'partial', 'strong', 'strong'],
    clusters: {
      Foundation: ['have','have','have','have','partial'],
      Automation: ['missing','missing','missing','missing','missing'],
      Delegation: ['have','have','have','missing','missing'],
      Craft:      ['have','have','have','have','have'],
      Hygiene:    ['have','have','have','have','partial'],
    },
    musthaves: ['have','have','have','missing','missing','missing','missing','have','have','missing','missing','have','have','have','have'],
  },

  alex: {
    handle: '@alex_builds', initial: 'A', weeks: 42,
    eyebrow: 'scanned just now · 42 weeks on claude code',
    title: "You've built a studio.",
    tiles: [
      { label: 'weeks',   value: '42',    equiv: 'early, not just current' },
      { label: 'agents',  value: '3',     equiv: 'review · tests · research' },
      { label: 'hooks',   value: '4',     equiv: '~2.4k steps/mo automated' },
      { label: 'prompts', value: '~2.1k', equiv: 'saved · ≈ 4 workdays back' },
    ],
    identity: "You don't install, you compose. You don't chase, you prune.",
    hours: 960, hoursMeaning: '120 workdays, or 40 full nights of sleep you could have taken',
    signature: 'you compose · you prune · you delegate',
    score: 88, tier: 'Orchestrator',
    chapterNote: "Almost every star is lit. The dim ones are on purpose.",
    chapterTags: ['strong', 'strong', 'strong', 'strong', 'strong'],
    clusters: {
      Foundation: ['have','have','have','have','partial'],
      Automation: ['have','have','have','have','partial'],
      Delegation: ['have','have','have','have','have'],
      Craft:      ['have','have','have','have','have'],
      Hygiene:    ['have','have','have','partial','have'],
    },
    musthaves: ['have','have','have','have','have','have','have','have','have','have','have','have','have','have','partial'],
  },
};

/* =========================================================
   MUST-HAVES - terse outcomes + paste-ready snippets
   ========================================================= */
const MUSTHAVES = [
  { cat: 'Foundation', title: 'Root <code>CLAUDE.md</code>',
    outcome: 'One file, house rules. Write once, stop re-explaining.',
    snippet: `# CLAUDE.md\n\n## Project\n<one sentence>\n\n## Conventions\n- formatter: prettier\n- tests: vitest\n\n## Do not\n- push to main\n- mock the database` },

  { cat: 'Foundation', title: '<code>settings.json</code> permissions allowlist',
    outcome: 'Stops the "allow?" prompt ~30× a day.',
    snippet: `{\n  "permissions": {\n    "allow": ["Bash(git:*)", "Bash(npm:*)", "Edit", "Write"]\n  }\n}` },

  { cat: 'Foundation', title: 'Sub-dir <code>CLAUDE.md</code> per repo',
    outcome: 'Per-project rules without global clutter.',
    snippet: `# <repo>/CLAUDE.md\n\n## This repo\n<what makes it different>\n\n## Local\n- layout\n- test runner\n- deploy target` },

  { cat: 'Automation', title: 'PostToolUse formatter hook',
    outcome: 'No more "please format." Diffs land clean.',
    snippet: `// .claude/hooks/post-tool-use.js\nexport default async ({ tool }) => {\n  if (['Edit','Write'].includes(tool.name)) {\n    await exec('npx prettier -w ' + tool.args.file_path);\n  }\n};` },

  { cat: 'Automation', title: 'PreToolUse guardrail hook',
    outcome: 'Blocks <code>rm -rf</code>, <code>--force</code>, <code>--no-verify</code>.',
    snippet: `// .claude/hooks/pre-tool-use.js\nconst BAN = [/rm\\s+-rf/, /--force/, /--no-verify/];\nexport default async ({ tool }) => {\n  const cmd = tool.args.command ?? '';\n  if (BAN.some(r => r.test(cmd))) throw new Error('blocked');\n};` },

  { cat: 'Automation', title: '3+ custom slash commands',
    outcome: 'Your workflow becomes a vocabulary. One word, not one paragraph.',
    snippet: `# .claude/commands/review.md\n---\ndescription: review the current diff against the plan\n---\nRead git diff main...HEAD.\nCompare against plan.md.\nList gaps as a checklist.` },

  { cat: 'Automation', title: 'SessionStart context loader',
    outcome: 'Every session starts primed.',
    snippet: `// .claude/hooks/session-start.js\nexport default async () => {\n  const recent = await exec('git log -5 --oneline');\n  return { additionalContext: 'Recent:\\n' + recent };\n};` },

  { cat: 'Delegation', title: 'GitHub MCP configured',
    outcome: 'PRs and issues without tab-switching.',
    snippet: `{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-github"]\n    }\n  }\n}` },

  { cat: 'Delegation', title: 'Five purposeful skills',
    outcome: 'Narrow beats broad. One job each.',
    snippet: `# .claude/skills/pr-review/SKILL.md\n---\nname: pr-review\ndescription: review one pull request\n---\n1. fetch diff\n2. check tests\n3. flag style\n4. one-paragraph summary` },

  { cat: 'Delegation', title: 'Code-review subagent',
    outcome: 'Parallel pass. Finds what you miss.',
    snippet: `# .claude/agents/code-reviewer.md\n---\nname: code-reviewer\ndescription: independent diff review\n---\nReview the diff.\nFlag bugs, security, unclear names.\nReturn { issues, verdict }.` },

  { cat: 'Delegation', title: 'Test-runner subagent',
    outcome: 'Tests run in parallel, results stream back.',
    snippet: `# .claude/agents/test-runner.md\n---\nname: test-runner\ndescription: run tests, report\n---\nRun: npm test\nParse output.\nReturn { passed, failed, output }.` },

  { cat: 'Craft', title: 'Plan mode before non-trivial work',
    outcome: '30 seconds, saves hours.',
    snippet: `// Before starting, type /plan\n// or press Shift+Tab\n// Claude outlines before touching files.` },

  { cat: 'Craft', title: 'Worktrees for parallel branches',
    outcome: 'Three agents, three trees, zero collisions.',
    snippet: `git worktree add .trees/feature-x -b feature-x\ncd .trees/feature-x && claude` },

  { cat: 'Craft', title: 'Verification ritual',
    outcome: 'Tests + typecheck before commit. The line between vibes and craft.',
    snippet: `# add to CLAUDE.md "Do":\n- run npm test && npm run typecheck before every commit\n- if either fails, fix first\n- never --no-verify` },

  { cat: 'Hygiene', title: 'Pruned duplicates',
    outcome: 'Noise costs score. Removing one makes the rest sharper.',
    snippet: `ls ~/.claude/skills/\n# delete overlaps like:\n# code-review / pr-review / review-pr\n# keep one, remove the rest` },
];

/* =========================================================
   HERO
   ========================================================= */
function renderHero(p) {
  document.getElementById('eyebrow').textContent = p.eyebrow;
  document.getElementById('hero-title').textContent = p.title;
  document.getElementById('handle-text').textContent = p.handle;
  document.getElementById('avatar').textContent = p.initial;
  document.getElementById('identity').textContent = p.identity;

  const wrap = document.getElementById('hero-stats');
  wrap.innerHTML = '';
  p.tiles.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'hs-tile';
    el.style.transitionDelay = (i * 60) + 'ms';
    el.innerHTML = `
      <div class="hs-label">${t.label}</div>
      <div class="hs-value">${t.value}</div>
      <div class="hs-equiv">${t.equiv}</div>
    `;
    wrap.appendChild(el);
  });
  requestAnimationFrame(() => {
    wrap.querySelectorAll('.hs-tile').forEach(t => t.classList.add('in'));
  });
}

/* =========================================================
   ATELIER - constellation + seal + foot
   ========================================================= */
function renderAtelier(p) {
  document.getElementById('atelier-handle').textContent = p.handle;
  document.getElementById('bench-hours').textContent = `${p.hours}h`;
  document.getElementById('bench-meaning').textContent = p.hoursMeaning;
  document.getElementById('bench-signature').textContent = p.signature;
  document.getElementById('seal-tier').textContent = p.tier;
  document.getElementById('bench-score').textContent = p.score;
  document.getElementById('seal-meta').textContent = `Wk ${p.weeks}`;

  const foot = document.getElementById('atelier-foot');
  foot.innerHTML = `
    <span>bench.dev/${p.handle.replace('@','')}</span>
    <span>scanned ${new Date().toISOString().slice(0,10)}</span>
  `;

  const linksG  = document.getElementById('links');
  const labelsG = document.getElementById('cluster-labels');
  const starsG  = document.getElementById('stars');
  [linksG, labelsG, starsG].forEach(g => g.innerHTML = '');

  const allStars = [];
  const allLinks = [];

  CLUSTER_FRAME.forEach(cluster => {
    const states = p.clusters[cluster.name];

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', cluster.cx);
    t.setAttribute('y', cluster.cy + 110);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = cluster.name;
    labelsG.appendChild(t);

    cluster.star_offsets.forEach((off, i) => {
      const state = states[i];
      const [dx, dy] = off;
      const x = cluster.cx + dx, y = cluster.cy + dy;

      if (state !== 'missing') {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', cluster.cx); l.setAttribute('y1', cluster.cy);
        l.setAttribute('x2', x); l.setAttribute('y2', y);
        linksG.appendChild(l);
        allLinks.push(l);
      }

      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      c.setAttribute('r', state === 'have' ? 5 : state === 'partial' ? 4.5 : 3.5);
      c.setAttribute('class', state === 'have' ? 'bright' : state === 'partial' ? 'partial' : 'dim');
      const ti = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      ti.textContent = `${CLUSTER_LABELS[cluster.name][i]} · ${state}`;
      c.appendChild(ti);
      starsG.appendChild(c);
      allStars.push(c);
    });
  });

  // staggered reveal
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    allStars.forEach(s => s.classList.add('revealed'));
    allLinks.forEach(l => l.classList.add('revealed'));
  } else {
    allStars.forEach((s, i) => setTimeout(() => s.classList.add('revealed'), 200 + i * 35));
    allLinks.forEach((l, i) => setTimeout(() => l.classList.add('revealed'), 200 + i * 40));
  }
}

/* =========================================================
   CHAPTERS STRIP
   ========================================================= */
function renderChapters(p) {
  const wrap = document.getElementById('chapters-strip');
  wrap.innerHTML = '';
  CHAPTER_META.forEach((m, i) => {
    const states = p.clusters[m.name];
    const pct = Math.round(states.filter(s => s === 'have').length / states.length * 100
              + states.filter(s => s === 'partial').length / states.length * 50);
    const tag = p.chapterTags[i];
    const tagText = tag === 'strong' ? 'strong' : tag === 'weak' ? 'needs work' : 'building';
    const tagClass = tag === 'strong' ? 'strong' : tag === 'weak' ? 'weak' : '';

    const el = document.createElement('div');
    el.className = 'chapter-cell';
    el.style.transitionDelay = (i * 50) + 'ms';
    el.innerHTML = `
      <div class="chapter-head">
        <div>
          <div class="chapter-numeral">${m.num}</div>
          <div class="chapter-name">${m.name}</div>
        </div>
        <div class="chapter-dial" data-value="${pct}" style="--val:${pct}"></div>
      </div>
      <div class="chapter-tag ${tagClass}">${tagText}</div>
    `;
    wrap.appendChild(el);
  });

  document.getElementById('chapter-note').innerHTML = p.chapterNote;

  requestAnimationFrame(() => {
    wrap.querySelectorAll('.chapter-cell').forEach(c => c.classList.add('in'));
  });
}

/* =========================================================
   MUST-HAVES - expand/collapse inline
   ========================================================= */
function renderMustHaves(p) {
  const ul = document.getElementById('mh-list');
  ul.innerHTML = '';
  let haveCount = 0;

  // Show missing first (sorted for quick wins), then have
  const indexed = MUSTHAVES.map((m, i) => ({ ...m, i, state: p.musthaves[i] }));
  const missing = indexed.filter(m => m.state !== 'have');
  const have = indexed.filter(m => m.state === 'have');
  const ordered = [...missing, ...have];
  haveCount = have.length;

  ordered.forEach((item, idx) => {
    const state = item.state;
    const glyph = state === 'have' ? checkSvg() : state === 'partial' ? halfSvg() : dashSvg();
    const showSnippet = state !== 'have';

    const li = document.createElement('li');
    li.className = 'mh-item';
    li.setAttribute('data-state', state);
    li.style.transitionDelay = Math.min(idx * 30, 600) + 'ms';
    li.innerHTML = `
      <div class="mh-state">${glyph}</div>
      <div class="mh-main">
        <div class="mh-title">${item.title}</div>
        <div class="mh-outcome">${item.outcome}</div>
        ${showSnippet ? `<div class="mh-snippet"><div class="mh-snippet-inner"><button class="mh-copy" data-idx="${item.i}">Copy</button><pre>${escapeHtml(item.snippet)}</pre></div></div>` : ''}
      </div>
      <div class="mh-aside">${item.cat}</div>
    `;
    ul.appendChild(li);
  });

  requestAnimationFrame(() => {
    ul.querySelectorAll('.mh-item').forEach(c => c.classList.add('in'));
  });

  // click-to-expand
  ul.addEventListener('click', (e) => {
    const copy = e.target.closest('.mh-copy');
    if (copy) {
      e.stopPropagation();
      const i = parseInt(copy.getAttribute('data-idx'), 10);
      navigator.clipboard.writeText(MUSTHAVES[i].snippet).then(() => toast('Snippet copied'));
      return;
    }
    const item = e.target.closest('.mh-item');
    if (!item || item.getAttribute('data-state') === 'have') return;
    item.classList.toggle('is-open');
  }, { once: false });
}

function escapeHtml(s) {
  return s.replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[c]);
}
function checkSvg() { return `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6.5 5 9.5 10 3.5"/></svg>`; }
function halfSvg()  { return `<svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3" fill="currentColor"/></svg>`; }
function dashSvg()  { return `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="9" y2="6"/></svg>`; }

/* =========================================================
   TOAST
   ========================================================= */
let toastT;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 1800);
}

/* =========================================================
   SHARE
   ========================================================= */
function wireShare() {
  document.getElementById('copy-cmd').addEventListener('click', () => {
    navigator.clipboard.writeText('npx bench').then(() => toast('copied'));
  });
  document.getElementById('download-art').addEventListener('click', () => {
    toast('(prototype) would render & download your bench as PNG');
  });
  document.getElementById('share-x').addEventListener('click', () => {
    const p = PERSONAS[currentPersona];
    const text = `${p.hours} hours with Claude Code. ${p.signature}. Bench ${p.score} · ${p.tier}. bench.dev/${p.handle.replace('@','')}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
  document.getElementById('share-li').addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://bench.dev')}`, '_blank', 'noopener');
  });
}

/* =========================================================
   PERSONA SWITCHING
   ========================================================= */
let currentPersona = 'priya';

function applyPersona(key) {
  currentPersona = key;
  const p = PERSONAS[key];
  document.querySelectorAll('.ps-btn').forEach(b => {
    b.classList.toggle('is-active', b.getAttribute('data-persona') === key);
  });
  renderHero(p);
  renderAtelier(p);
  renderChapters(p);
  renderMustHaves(p);
}

function wirePersonaSwitcher() {
  document.querySelectorAll('.ps-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPersona(btn.getAttribute('data-persona')));
  });
}

/* =========================================================
   BOOT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  applyPersona('priya');
  wirePersonaSwitcher();
  wireShare();
});

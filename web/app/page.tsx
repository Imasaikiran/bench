import type { Metadata } from "next";
import { CopyInstall } from "./_components/CopyInstall";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "bench — score your Claude Code setup",
  description:
    "A one-page honest portrait of your Claude Code setup. 25-dimension open rubric. Local scan. No AI in scoring. Zero accounts unless you claim a handle.",
  openGraph: {
    title: "bench — score your Claude Code setup",
    description:
      "A one-page honest portrait of your Claude Code setup. 25-dimension open rubric. Local scan. No AI in scoring.",
  },
};

const styles = `
  :root {
    --bg: #08080A;
    --fg: #F4F1EA;
    --fg-2: #C9C4B8;
    --muted: #6B6660;
    --muted-2: #3A3833;
    --border: #1A1A1E;
    --border-2: #28262B;
    --accent: #C9A96E;
    --accent-2: #E0BC81;
    --ok: #84E1A0;
    --serif: ui-serif, Georgia, "Source Serif Pro", serif;
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: ui-monospace, "SF Mono", Menlo, monospace;
    --maxw: 1080px;
  }

  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: var(--sans);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(201,169,110,0.3); transition: border-color 0.15s ease; }
  a:hover { border-bottom-color: var(--accent); }

  .land {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 0 32px;
  }

  .land-top {
    display: flex; justify-content: space-between; align-items: center;
    padding: 22px 0;
    border-bottom: 1px solid var(--border);
  }
  .land-wordmark {
    font-family: var(--serif);
    font-size: 22px;
    letter-spacing: -0.02em;
  }
  .land-wordmark span { color: var(--accent); font-style: italic; }
  .land-nav {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--fg-2);
    letter-spacing: 0.04em;
    display: flex; gap: 18px;
  }
  .land-nav a { color: var(--fg-2); border-bottom: 0; }
  .land-nav a:hover { color: var(--accent); }

  .hero { padding: 88px 0 56px; }
  .hero-eyebrow {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 28px;
  }
  .hero-title {
    font-family: var(--serif);
    font-weight: 400;
    font-size: clamp(48px, 7vw, 96px);
    line-height: 1.02;
    letter-spacing: -0.035em;
    margin: 0 0 28px;
    max-width: 16ch;
  }
  .hero-title em { color: var(--accent); font-style: italic; }
  .hero-sub {
    font-family: var(--serif);
    font-size: clamp(18px, 1.6vw, 22px);
    line-height: 1.5;
    color: var(--fg-2);
    max-width: 60ch;
    margin: 0 0 40px;
  }

  .install {
    background: #0E0E12;
    border: 1px solid var(--border-2);
    border-radius: 8px;
    padding: 18px 22px;
    display: inline-flex;
    align-items: center;
    gap: 14px;
    font-family: var(--mono);
    font-size: 16px;
    margin: 0 0 12px;
  }
  .install-prompt { color: var(--muted); }
  .install-cmd { color: var(--fg); }

  .install-note {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0 0 56px;
  }

  .what {
    border-top: 1px solid var(--border);
    padding: 64px 0;
  }
  .what-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 32px;
  }
  .what-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .what-cell h3 {
    font-family: var(--serif);
    font-size: 24px;
    font-weight: 400;
    margin: 0 0 12px;
    color: var(--fg);
    letter-spacing: -0.015em;
  }
  .what-cell p {
    font-size: 15px;
    color: var(--fg-2);
    line-height: 1.6;
    margin: 0;
  }
  .what-cell .num {
    font-family: var(--serif);
    font-style: italic;
    font-size: 14px;
    color: var(--accent);
    margin-bottom: 10px;
    display: block;
  }

  .trust {
    border-top: 1px solid var(--border);
    padding: 64px 0;
  }
  .trust-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 28px 64px;
  }
  .trust-row { display: flex; gap: 18px; align-items: flex-start; }
  .trust-row .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--accent);
    margin-top: 8px;
    flex: none;
    box-shadow: 0 0 12px rgba(201,169,110,0.4);
  }
  .trust-row strong {
    font-family: var(--serif);
    font-weight: 400;
    font-size: 17px;
    color: var(--fg);
    display: block;
    margin-bottom: 4px;
    letter-spacing: -0.01em;
  }
  .trust-row span {
    font-size: 14px;
    color: var(--fg-2);
    line-height: 1.55;
  }

  .preview {
    border-top: 1px solid var(--border);
    padding: 80px 0;
    text-align: center;
  }
  .preview h2 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: clamp(32px, 4.4vw, 48px);
    letter-spacing: -0.025em;
    margin: 0 0 20px;
  }
  .preview p {
    color: var(--fg-2);
    max-width: 56ch;
    margin: 0 auto 28px;
    font-size: 16px;
    line-height: 1.6;
  }
  .preview .btn {
    display: inline-block;
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #08080A;
    background: var(--accent);
    border: 1px solid var(--accent);
    padding: 14px 28px;
    border-radius: 999px;
    transition: background 0.15s ease;
  }
  .preview .btn:hover { background: var(--accent-2); border-color: var(--accent-2); }

  .bet {
    border-top: 1px solid var(--border);
    padding: 64px 0;
  }
  .bet h2 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: 28px;
    margin: 0 0 20px;
    letter-spacing: -0.02em;
  }
  .bet p {
    color: var(--fg-2);
    max-width: 64ch;
    font-size: 15px;
    line-height: 1.65;
    margin: 0 0 14px;
  }
  .bet em { color: var(--accent); font-style: italic; }

  footer {
    border-top: 1px solid var(--border);
    padding: 36px 0 56px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }
  footer a { color: var(--muted); border-bottom: 0; }
  footer a:hover { color: var(--accent); }

  @media (max-width: 720px) {
    .land { padding: 0 20px; }
    .what-grid { grid-template-columns: 1fr; gap: 36px; }
    .trust-grid { grid-template-columns: 1fr; gap: 22px; }
    .install { font-size: 14px; padding: 14px 16px; gap: 10px; }
    .hero { padding: 56px 0 36px; }
  }
`;

export default function Landing() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="land">
        <header className="land-top">
          <div className="land-wordmark">
            bench<span>.</span>
          </div>
          <nav className="land-nav" aria-label="primary">
            <a href="/demo">Demo</a>
            <a href="/rubric">Rubric</a>
            <a href="/how-we-scored">How we scored</a>
            <a href="https://github.com/Imasaikiran/bench">GitHub</a>
          </nav>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <p className="hero-eyebrow">25 dimensions · 5 chapters · open rubric</p>
          <h1 id="hero-title" className="hero-title">
            A portrait of <em>how you work</em> with Claude Code.
          </h1>
          <p className="hero-sub">
            One terminal command reads your <code>~/.claude/</code> directory, scores it
            against a published rubric, and renders a one-page card you can share.
            Nothing leaves your machine until you type <code>y</code>.
          </p>
          <CopyInstall />
          <p className="install-note">
            5 minutes · zero accounts · zero installs · macOS · Linux · Windows
          </p>
        </section>

        <section className="what" aria-label="what bench shows you">
          <p className="what-label">What you'll see</p>
          <div className="what-grid">
            <div className="what-cell">
              <span className="num">i.</span>
              <h3>A score that links to a formula</h3>
              <p>
                Bench 0–100, persona tier, and a hero number for hours spent with
                Claude Code. Every digit traces back to <a href="/how-we-scored">/how-we-scored</a>.
                No AI guessed at the number.
              </p>
            </div>
            <div className="what-cell">
              <span className="num">ii.</span>
              <h3>What's working, what to prune</h3>
              <p>
                Five chapters — Foundation, Automation, Delegation, Craft, Coherence —
                each with five concrete dimensions. Plus a curated 15-item must-have
                list with code snippets for the gaps.
              </p>
            </div>
            <div className="what-cell">
              <span className="num">iii.</span>
              <h3>A URL you'd actually share</h3>
              <p>
                Optional GitHub-OAuth claim turns your scan into <code>bench.dev/u/&lt;handle&gt;</code>
                with a card that previews on X and LinkedIn automatically.
              </p>
            </div>
          </div>
        </section>

        <section className="trust" aria-label="trust posture">
          <p className="what-label">The trust contract</p>
          <div className="trust-grid">
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>Open-source scanner from commit #1.</strong>
                <span>
                  Don't trust me, read the source: every byte that leaves your laptop
                  is in <a href="https://github.com/Imasaikiran/bench/blob/main/cli">cli/</a>.
                </span>
              </div>
            </div>
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>No LLM in the scoring path.</strong>
                <span>
                  Deterministic parsing only. The same setup produces the same score
                  forever, until the rubric explicitly bumps version.
                </span>
              </div>
            </div>
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>Consent gate, default = no.</strong>
                <span>
                  The CLI prints the exact JSON it will upload, then waits for{" "}
                  <code>y</code>. No <code>--yes</code> shortcut. No silent retry.
                </span>
              </div>
            </div>
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>Single egress, redacted payload.</strong>
                <span>
                  Only <code>bench.dev</code>. Only structured numbers and tier labels.
                  Secrets matched by an open <a href="https://github.com/Imasaikiran/bench/blob/main/cli/src/redactor.ts">pattern list</a>{" "}
                  are stripped before the payload is built.
                </span>
              </div>
            </div>
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>30-day TTL on anonymous scans.</strong>
                <span>
                  Auto-deleted unless you claim a handle. Claimed profiles have a
                  one-click delete.
                </span>
              </div>
            </div>
            <div className="trust-row">
              <span className="dot" />
              <div>
                <strong>Zero revenue, on purpose.</strong>
                <span>
                  No paid tier. No leaderboard. No coach. The product wins by being
                  beloved, not by retaining you.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="preview" aria-label="see a sample">
          <h2>See what one looks like.</h2>
          <p>
            <a href="/demo">Priya</a> is a synthetic Tinkerer at week 14. The card you
            get from <code>npx</code> looks like this — your numbers, your verbs.
          </p>
          <a href="/demo" className="btn">Open the demo →</a>
        </section>

        <section className="bet" aria-labelledby="bet-h">
          <h2 id="bet-h">The bet behind this.</h2>
          <p>
            Adoption of Claude Code outran shared practice. Everyone has a{" "}
            <code>CLAUDE.md</code>, a few skills, some hooks — and no honest read on
            whether any of it actually makes them better. <em>bench is the mirror</em>.
          </p>
          <p>
            The rubric is open. Roast it. PR it. The CLI ships if the rubric earns it.
            See the <a href="https://github.com/Imasaikiran/bench/blob/main/docs/specs/2026-04-25-bench-v2-design.md">design spec</a>{" "}
            and <a href="https://github.com/Imasaikiran/bench/blob/main/docs/plans/phase0-signal.md">Phase 0 signal audit</a>{" "}
            for how this gets killed if the bet is wrong.
          </p>
        </section>

        <footer>
          <span>v0.1 alpha · scored with rubric v0.1.0</span>
          <span>
            <a href="/rubric">Rubric</a> · <a href="/how-we-scored">How we scored</a> ·{" "}
            <a href="https://github.com/Imasaikiran/bench">github</a>
          </span>
        </footer>
      </div>
    </>
  );
}

import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About bench: why this exists",
  description: "bench is a side project that scores a Claude Code setup. Open scorecard, no AI in scoring, zero revenue. Built for the anxious improver.",
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
    --serif: ui-serif, Georgia, "Source Serif Pro", serif;
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: ui-monospace, "SF Mono", Menlo, monospace;
    --maxw: 760px;
  }
  html, body { margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--fg); font-family: var(--sans); line-height: 1.65; }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(201,169,110,0.3); }
  a:hover { border-bottom-color: var(--accent); }

  .about { max-width: var(--maxw); margin: 0 auto; padding: 0 32px; }

  .about-top {
    display: flex; justify-content: space-between; align-items: center;
    padding: 22px 0;
    border-bottom: 1px solid var(--border);
  }
  .about-wordmark { font-family: var(--serif); font-size: 22px; letter-spacing: -0.02em; }
  .about-wordmark span { color: var(--accent); font-style: italic; }
  .about-nav {
    font-family: var(--mono); font-size: 12px; color: var(--fg-2);
    letter-spacing: 0.04em; display: flex; gap: 18px;
  }
  .about-nav a { color: var(--fg-2); border-bottom: 0; }
  .about-nav a:hover { color: var(--accent); }

  .hero { padding: 80px 0 40px; }
  .eyebrow {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--muted); margin: 0 0 24px;
  }
  h1 {
    font-family: var(--serif); font-weight: 400;
    font-size: clamp(40px, 5.6vw, 72px); line-height: 1.05;
    letter-spacing: -0.03em; margin: 0 0 28px; max-width: 18ch;
  }
  h1 em { color: var(--accent); font-style: italic; }

  section { padding: 36px 0; border-top: 1px solid var(--border); }
  section:first-of-type { border-top: 0; }

  h2 {
    font-family: var(--serif); font-weight: 400;
    font-size: 28px; letter-spacing: -0.02em;
    margin: 0 0 16px;
  }
  p { color: var(--fg-2); font-size: 17px; line-height: 1.7; max-width: 64ch; margin: 0 0 16px; }
  p em { color: var(--accent); font-style: italic; }

  ul.bare { list-style: none; padding: 0; margin: 0 0 16px; max-width: 64ch; }
  ul.bare li {
    color: var(--fg-2); font-size: 17px; padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  ul.bare li:last-child { border-bottom: 0; }
  ul.bare li::before { content: "- "; color: var(--accent); }

  footer {
    border-top: 1px solid var(--border);
    padding: 32px 0 56px; margin-top: 40px;
    font-family: var(--mono); font-size: 11px; color: var(--muted);
    letter-spacing: 0.06em; text-transform: uppercase;
    display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap;
  }
  footer a { color: var(--muted); border-bottom: 0; }
  footer a:hover { color: var(--accent); }

  @media (max-width: 720px) {
    .about { padding: 0 20px; }
    .hero { padding: 56px 0 28px; }
    h1 { font-size: 36px; }
  }
`;

export default function About() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="about">
        <header className="about-top">
          <div className="about-wordmark">bench<span>.</span></div>
          <nav className="about-nav" aria-label="primary">
            <a href="/">Home</a>
            <a href="/demo">Demo</a>
            <a href="/about">About</a>
            <a href="/rubric">Scorecard</a>
            <a href="https://github.com/Imasaikiran/bench">GitHub</a>
          </nav>
        </header>

        <section className="hero">
          <p className="eyebrow">about</p>
          <h1>I built bench because <em>nobody had a mirror.</em></h1>
        </section>

        <section>
          <h2>What bench is</h2>
          <p>
            <code>npx @imasaikiran/bench</code> scans your{" "}
            <code>~/.claude/</code> directory, scores it against a versioned open
            rubric, and renders a one-page card with a hero number, a five-chapter
            breakdown, and a curated must-haves list. It runs locally until you
            type <code>y</code>. The card lives at <code>bench.dev/u/&lt;handle&gt;</code> if
            you claim one through GitHub OAuth.
          </p>
        </section>

        <section>
          <h2>Why this exists</h2>
          <p>
            Adoption of Claude Code outran shared practice. Everyone has a{" "}
            <code>CLAUDE.md</code>, a few skills, a hook or two, and no honest
            read on whether any of it is actually making them better. Blog posts
            show what good looks like. None of them tell <em>you</em> if your
            setup is good.
          </p>
          <p>
            bench is built for what I call <em>the anxious improver</em>: 8–20
            weeks on Claude Code, has invested real time, suspects the setup
            could be tighter, doesn't know where. This is the fat middle of the
            distribution. If you're brand new, the score will be honest about
            that. Come back in a week. If you're already posting your setup
            publicly, the rubric won't tell you anything you don't know.
          </p>
        </section>

        <section>
          <h2>What it isn't</h2>
          <ul className="bare">
            <li>Not a leaderboard. Tier names exist; ranks don't.</li>
            <li>No LLM in the scoring path. Deterministic parsing, period.</li>
            <li>No paid tier, no subscription, no enterprise plan, ever.</li>
            <li>No email list. No drip. No "here's a weekly digest."</li>
          </ul>
        </section>

        <section>
          <h2>The bet</h2>
          <p>
            If a developer sees a one-page honest portrait of their Claude Code
            setup that names what's working and gives them a fat hero number they
            earned, at least 15% will share the URL within 7 days and 20% will
            re-scan within 4 weeks. If those numbers don't show up, the bet is
            wrong and the project gets parked.
          </p>
          <p>
            The full design spec is open:{" "}
            <a href="https://github.com/Imasaikiran/bench/blob/main/docs/specs/2026-04-25-bench-v2-design.md">
              docs/specs/2026-04-25-bench-v2-design.md
            </a>
            . Every formula is at <a href="/how-we-scored">/how-we-scored</a>.
          </p>
        </section>

        <section>
          <h2>The author</h2>
          <p>
            I'm Sai (<a href="https://github.com/Imasaikiran">@Imasaikiran on GitHub</a>),
            a developer who's been using Claude Code for too long to be comfortable
            without a mirror. bench is a side project. There is no team, no
            funding, no plan to monetise. I'm building it because I want it to
            exist, and the world I want it to exist in is one where the rubric
            is open and someone else can run it without my permission.
          </p>
        </section>

        <section>
          <h2>Open by design</h2>
          <ul className="bare">
            <li>
              The scorecard is open: <a href="/rubric">/rubric</a> renders{" "}
              <code>rubric/rubric.yaml</code> straight from the repo.
            </li>
            <li>
              The scanner is open:{" "}
              <a href="https://github.com/Imasaikiran/bench/tree/main/cli">github.com/Imasaikiran/bench/cli</a>.
              Every byte that leaves your machine is in this directory.
            </li>
            <li>
              The spec is open:{" "}
              <a href="https://github.com/Imasaikiran/bench/tree/main/docs/specs">docs/specs</a>.
              The architect-review feedback that reshaped it lives in commit history.
            </li>
            <li>
              Governance is open: see the rubric constitution at{" "}
              <a href="https://github.com/Imasaikiran/bench/blob/main/docs/specs/2026-04-25-bench-v2-design.md#61-rubric-governance-constitution">spec §6.1</a>{" "}
              for how edits move from PR to merged.
            </li>
          </ul>
        </section>

        <footer>
          <span>v0.1 alpha · scored with scorecard v0.2.0</span>
          <span>
            <a href="/">Home</a> · <a href="/rubric">Scorecard</a> · <a href="/how-we-scored">How we scored</a>
          </span>
        </footer>
      </div>
    </>
  );
}

import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import type { Rubric } from "../../lib/rubric-render";

export const dynamic = "force-static";

const RUBRIC_GH_URL =
  "https://github.com/Imasaikiran/bench/blob/v2-dev/rubric/rubric.yaml";
const RUBRIC_PR_URL =
  "https://github.com/Imasaikiran/bench/pulls?q=is%3Apr+rubric";

function isRubric(value: unknown): value is Rubric {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "string" &&
    !!v.chapters &&
    typeof v.chapters === "object"
  );
}

const page: React.CSSProperties = {
  background: "#08080A",
  color: "#F2F2F5",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  minHeight: "100dvh",
  padding: "64px 28px",
};
const wrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto" };
const eyebrow: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6B6D78",
  marginBottom: 12,
};
const h1: React.CSSProperties = {
  fontFamily:
    "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  fontWeight: 400,
  fontSize: 56,
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  margin: "0 0 16px",
};
const lede: React.CSSProperties = {
  color: "#A8A9B3",
  fontSize: 17,
  lineHeight: 1.55,
  margin: "0 0 12px",
  maxWidth: 600,
};
const versionLine: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 13,
  color: "#6B6D78",
  margin: "0 0 48px",
};
const link: React.CSSProperties = {
  color: "#C9A96E",
  textDecoration: "none",
  borderBottom: "1px solid #8A6F3A",
};
const chapterBlock: React.CSSProperties = { marginBottom: 56 };
const chapterHead: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  borderBottom: "1px solid #1E1E26",
  paddingBottom: 10,
  marginBottom: 24,
};
const chapterName: React.CSSProperties = {
  fontFamily:
    "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  fontWeight: 400,
  fontSize: 32,
  margin: 0,
  letterSpacing: "-0.01em",
};
const chapterMeta: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12,
  color: "#6B6D78",
};
const dim: React.CSSProperties = {
  background: "#111117",
  border: "1px solid #1E1E26",
  borderRadius: 10,
  padding: "20px 24px",
  marginBottom: 14,
};
const dimHead: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  marginBottom: 12,
};
const dimId: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 12,
  color: "#6B6D78",
};
const dimName: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 500,
  color: "#F2F2F5",
  margin: 0,
};
const weightTag: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 11,
  color: "#C9A96E",
  marginLeft: "auto",
};
const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "80px 1fr",
  gap: 12,
  fontSize: 14,
  lineHeight: 1.55,
  marginBottom: 6,
};
const rowLabel: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B6D78",
  paddingTop: 2,
};
const rowValueCode: React.CSSProperties = {
  fontFamily:
    "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 13,
  color: "#A8A9B3",
};
const rowValueText: React.CSSProperties = { color: "#A8A9B3" };

export default function RubricPage() {
  const parsed = load(readFileSync("../rubric/rubric.yaml", "utf8"));
  if (!isRubric(parsed)) {
    throw new Error(
      "rubric.yaml missing or malformed: expected { version, chapters }",
    );
  }
  const totalDimensions = Object.values(parsed.chapters).reduce(
    (n, ch) => n + ch.dimensions.length,
    0,
  );

  return (
    <main style={page}>
      <div style={wrap}>
        <div style={eyebrow}>open rubric · community-editable</div>
        <h1 style={h1}>Scorecard.</h1>
        <p style={lede}>
          {`${totalDimensions} checks across ${Object.keys(parsed.chapters).length} chapters. Every score on every card derives from this file. No closed weighting. No daily re-scoring theatre.`}
        </p>
        <p style={versionLine}>
          {`rubric v${parsed.version} · `}
          <a href={RUBRIC_GH_URL} style={link}>
            rubric.yaml on GitHub
          </a>
          {` · `}
          <a href={RUBRIC_PR_URL} style={link}>
            propose a change
          </a>
        </p>

        {Object.entries(parsed.chapters).map(([name, ch]) => {
          const totalWeight = ch.dimensions
            .reduce((s, d) => s + d.weight, 0)
            .toFixed(1);
          return (
            <section key={name} style={chapterBlock}>
              <header style={chapterHead}>
                <h2 style={chapterName}>{name}</h2>
                <span style={chapterMeta}>
                  {`${ch.dimensions.length} checks · weight ${totalWeight}`}
                </span>
              </header>
              {ch.dimensions.map((d) => (
                <article key={d.id} style={dim}>
                  <header style={dimHead}>
                    <span style={dimId}>{`#${d.id}`}</span>
                    <h3 style={dimName}>{d.name}</h3>
                    <span style={weightTag}>{`weight ${d.weight.toFixed(1)}`}</span>
                  </header>
                  <div style={row}>
                    <span style={rowLabel}>have</span>
                    <span style={rowValueCode}>{d.have_criteria}</span>
                  </div>
                  {d.partial_criteria ? (
                    <div style={row}>
                      <span style={rowLabel}>partial</span>
                      <span style={rowValueCode}>{d.partial_criteria}</span>
                    </div>
                  ) : null}
                  <div style={row}>
                    <span style={rowLabel}>why</span>
                    <span style={rowValueText}>{d.rationale}</span>
                  </div>
                  {d.sources.length ? (
                    <div style={row}>
                      <span style={rowLabel}>sources</span>
                      <span style={rowValueText}>
                        {d.sources.map((s, i) => (
                          <span key={s}>
                            {i > 0 ? ", " : ""}
                            <a href={s} style={link}>
                              {s}
                            </a>
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}

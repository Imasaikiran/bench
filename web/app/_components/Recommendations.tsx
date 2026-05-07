import type { ReactElement } from "react";
import type { PersonaShape } from "../../lib/mapper";
import { recommend, RUBRIC_VERSION } from "../../lib/recommendations";

const styles = `
  .bench-recs {
    max-width: 720px;
    margin: 2.5rem auto 0;
    padding: 2rem 1.5rem 2.5rem;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #1a1a1a;
  }
  .bench-recs h2 {
    font-family: ui-serif, Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
  }
  .bench-recs > p {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 1.25rem;
  }
  .bench-rec {
    padding: 1rem 0;
    border-bottom: 1px solid #e2e0db;
  }
  .bench-rec:last-child { border-bottom: 0; }
  .bench-rec h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
  }
  .bench-rec h3 .bench-rec-id {
    color: #999;
    font-weight: 500;
    margin-right: 0.4rem;
  }
  .bench-rec h3 .bench-rec-state {
    font-size: 0.7rem;
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-left: 0.5rem;
    vertical-align: middle;
    font-weight: 500;
  }
  .bench-rec-state[data-state="missing"] { background: #b3441b; color: #fff; }
  .bench-rec-state[data-state="partial"] { background: #d6c9a8; color: #4a3f1e; }
  .bench-rec p { font-size: 0.9rem; line-height: 1.55; color: #555; margin-bottom: 0.4rem; }
  .bench-rec p b { color: #1a1a1a; font-weight: 600; }
  .bench-rec .bench-rec-why { font-style: italic; color: #777; }
  .bench-rec .bench-rec-sources { font-size: 0.8rem; }
  .bench-rec .bench-rec-sources a { color: #b3441b; text-decoration: underline; text-underline-offset: 2px; margin-right: 0.75rem; }
  .bench-recs-footer {
    font-size: 0.78rem;
    color: #999;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e2e0db;
  }
`;

const MAX_RECS = 6;

export function Recommendations({ persona }: { persona: PersonaShape }): ReactElement | null {
  const recs = recommend(persona);
  if (recs.length === 0) return null;
  const shown = recs.slice(0, MAX_RECS);
  const hiddenCount = recs.length - shown.length;

  return (
    <section className="bench-recs" aria-label="Recommendations">
      <style>{styles}</style>
      <h2>What to do, in order</h2>
      <p>
        Each step is a missing or partial dimension from rubric v{RUBRIC_VERSION}.
        Copy is sourced from <code>rubric.yaml</code> &mdash; nothing here is editorial.
      </p>
      {shown.map((r) => (
        <div key={r.dimensionId} className="bench-rec">
          <h3>
            <span className="bench-rec-id">#{r.dimensionId}</span>
            {r.name} &middot; <span style={{ color: "#999", fontWeight: 500 }}>{r.chapter}</span>
            <span className="bench-rec-state" data-state={r.state}>
              {r.state}
            </span>
          </h3>
          <p>
            <b>Have:</b> {r.haveCriteria}
            {r.partialCriteria ? (
              <>
                {" "}&middot; <b>Partial:</b> {r.partialCriteria}
              </>
            ) : null}
          </p>
          <p className="bench-rec-why">{r.rationale}</p>
          {r.sources.length > 0 ? (
            <p className="bench-rec-sources">
              {r.sources.map((s) => (
                <a key={s} href={s} target="_blank" rel="noopener noreferrer">
                  &uarr; docs
                </a>
              ))}
            </p>
          ) : null}
        </div>
      ))}
      <p className="bench-recs-footer">
        Showing top {shown.length} of {recs.length}
        {hiddenCount > 0 ? ` (+${hiddenCount} more deferred)` : ""}.
        Sorted: missing before partial, heavier weight first.
      </p>
    </section>
  );
}

export default Recommendations;

"use client";

import { useState } from "react";
import { plausible } from "../../lib/plausible";

const MAX_REASON_LEN = 500;

const DIMENSION_OPTIONS = [
  { value: "", label: "(pick one, optional)" },
  { value: "hours", label: "Hours number" },
  { value: "tier", label: "Tier" },
  { value: "score", label: "Score" },
  { value: "Foundation", label: "Chapter: Foundation" },
  { value: "Automation", label: "Chapter: Automation" },
  { value: "Delegation", label: "Chapter: Delegation" },
  { value: "Craft", label: "Chapter: Craft" },
  { value: "Coherence", label: "Chapter: Coherence" },
  { value: "other", label: "Other" },
] as const;

const styles = `
  .bench-feedback {
    max-width: 520px;
    margin: 0 auto;
    padding: 1.25rem 1rem 0.5rem;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #1a1a1a;
  }
  .bench-feedback-trigger {
    background: transparent;
    border: 1px solid #d8d6cf;
    color: #555;
    padding: 0.7rem 1rem;
    font-size: 0.95rem;
    border-radius: 999px;
    cursor: pointer;
    width: 100%;
    min-height: 44px;
  }
  .bench-feedback-trigger:hover { background: #f3f3ef; color: #1a1a1a; }
  .bench-feedback-panel {
    margin-top: 0.5rem;
    padding: 1rem;
    background: #f7f6f3;
    border-radius: 8px;
  }
  .bench-feedback-panel label {
    display: block;
    font-size: 0.85rem;
    color: #555;
    margin-bottom: 0.3rem;
  }
  .bench-feedback-panel select,
  .bench-feedback-panel textarea {
    width: 100%;
    padding: 0.55rem 0.7rem;
    font-size: 0.95rem;
    font-family: inherit;
    border: 1px solid #d8d6cf;
    border-radius: 6px;
    background: #fff;
    box-sizing: border-box;
  }
  .bench-feedback-panel textarea {
    margin-bottom: 0.3rem;
    min-height: 90px;
    resize: vertical;
    line-height: 1.45;
  }
  .bench-feedback-counter {
    font-size: 0.8rem;
    color: #888;
    text-align: right;
    margin-bottom: 0.6rem;
  }
  .bench-feedback-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .bench-feedback-actions button {
    padding: 0.7rem 1.1rem;
    font-size: 0.9rem;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    min-height: 44px;
  }
  .bench-feedback-actions button[data-bench-feedback-cancel] {
    background: transparent;
    color: #555;
    border: 1px solid #d8d6cf;
  }
  .bench-feedback-actions button[data-bench-feedback-submit] {
    background: #1a1a1a;
    color: #f7f6f3;
  }
  .bench-feedback-actions button[disabled] { opacity: 0.5; cursor: not-allowed; }
  .bench-feedback-status {
    margin-top: 0.6rem;
    font-size: 0.9rem;
    color: #444;
  }
  .bench-feedback-status[data-bench-state="error"] { color: #b14040; }
  .bench-feedback-status[data-bench-state="ok"] { color: #2c6e3a; }
  @media (max-width: 380px) {
    .bench-feedback { padding: 1rem 1rem 0.5rem; }
    .bench-feedback-trigger { font-size: 1rem; }
    .bench-feedback-actions { flex-direction: column-reverse; }
    .bench-feedback-actions button { width: 100%; }
  }
`;

export type FeedbackPayload = {
  scan_id: string;
  dimension: string | null;
  reason: string;
};

/**
 * Pure helper: builds the JSON payload sent to /api/feedback.
 * Trims whitespace, normalises empty dimension to null, clamps reason length.
 * Exported for unit tests, no React imports here.
 */
export function buildFeedbackPayload(
  scanId: string,
  dimension: string,
  reason: string,
): FeedbackPayload {
  const trimmedReason = reason.trim().slice(0, MAX_REASON_LEN);
  const dim = dimension.trim();
  return {
    scan_id: scanId,
    dimension: dim === "" ? null : dim,
    reason: trimmedReason,
  };
}

export function isPayloadSubmittable(p: FeedbackPayload): boolean {
  return p.scan_id.length > 0 && p.reason.length > 0;
}

type Status = null | "submitting" | "ok" | "error" | "rate_limited" | "not_found";

export function ShortStatusMessage(s: Exclude<Status, null | "submitting">): string {
  switch (s) {
    case "ok": return "Thanks, we read every one.";
    case "error": return "Couldn't reach the server. Try again in a moment.";
    case "rate_limited": return "Too many submissions. Try again in a few minutes.";
    case "not_found": return "This scan no longer exists. Refresh the page.";
  }
}

export function FeedbackForm({ scanId }: { scanId: string | undefined }): React.ReactElement | null {
  // Anonymous demo or unclaimed pages without a scanId render no form.
  // Spec note: /demo uses synthetic Priya, feedback there pollutes signal (§5.8).
  const [open, setOpen] = useState(false);
  const [dimension, setDimension] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<Status>(null);

  if (!scanId) return null;

  const payload = buildFeedbackPayload(scanId, dimension, reason);
  const submittable = isPayloadSubmittable(payload) && status !== "submitting";

  async function submit() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        plausible("feedback_submit", payload.dimension ? { dimension: payload.dimension } : undefined);
        setStatus("ok");
        setReason("");
        setDimension("");
        return;
      }
      if (res.status === 404) { setStatus("not_found"); return; }
      if (res.status === 429) { setStatus("rate_limited"); return; }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="bench-feedback" data-bench-feedback>
        {!open ? (
          <button
            type="button"
            className="bench-feedback-trigger"
            onClick={() => { setOpen(true); setStatus(null); }}
            data-bench-feedback-trigger
          >
            Is a number wrong?
          </button>
        ) : (
          <div className="bench-feedback-panel">
            <label htmlFor="bench-feedback-dim">What's wrong (optional)</label>
            <select
              id="bench-feedback-dim"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              disabled={status === "submitting"}
              data-bench-feedback-dim
            >
              {DIMENSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label htmlFor="bench-feedback-reason" style={{ marginTop: "0.7rem" }}>
              Tell us why (under 500 chars)
            </label>
            <textarea
              id="bench-feedback-reason"
              value={reason}
              maxLength={MAX_REASON_LEN}
              onChange={(e) => setReason(e.target.value)}
              disabled={status === "submitting"}
              data-bench-feedback-reason
              placeholder="e.g. Hours feels low. I had a 3-day block off but the scan still shows ~80h."
            />
            <div className="bench-feedback-counter">
              {reason.length}/{MAX_REASON_LEN}
            </div>
            <div className="bench-feedback-actions">
              <button
                type="button"
                onClick={() => { setOpen(false); setStatus(null); }}
                data-bench-feedback-cancel
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!submittable}
                onClick={submit}
                data-bench-feedback-submit
              >
                {status === "submitting" ? "Sending…" : "Send"}
              </button>
            </div>
            {status && status !== "submitting" && (
              <div
                className="bench-feedback-status"
                data-bench-state={status === "ok" ? "ok" : "error"}
                role="status"
              >
                {ShortStatusMessage(status)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default FeedbackForm;

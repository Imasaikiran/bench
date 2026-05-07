"use client";

import { useEffect, useState } from "react";
import type { PersonaShape } from "../../lib/mapper";
import { plausible } from "../../lib/plausible";

const STORAGE_KEY = "bench.og_disclosed";

const shareBarStyles = `
  .bench-share-bar {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    padding: 1.5rem 1rem;
    font-family: ui-sans-serif, system-ui, sans-serif;
    flex-wrap: wrap;
  }
  /* Spec §11 mobile NFR — tap targets ≥ 44px. Padding 0.85rem 1.4rem with
     0.95rem font-size gives ~46px button height across all viewports.
     Min-width keeps thumb-reachable on 320px screens without stacking. */
  .bench-share-bar button {
    background: #1a1a1a;
    color: #f7f6f3;
    border: 0;
    padding: 0.85rem 1.4rem;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    cursor: pointer;
    border-radius: 999px;
    min-height: 44px;
    min-width: 120px;
  }
  .bench-share-bar button:hover { background: #333; }
  @media (max-width: 380px) {
    .bench-share-bar { flex-direction: column; align-items: stretch; padding: 1rem 1rem; }
    .bench-share-bar button { width: 100%; }
  }

  .bench-disclosure-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  }
  .bench-disclosure-panel {
    background: #fff;
    max-width: 480px;
    padding: 1.5rem 1.5rem 1.25rem;
    border-radius: 8px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #1a1a1a;
  }
  .bench-disclosure-panel h2 {
    font-family: ui-serif, Georgia, serif;
    font-size: 1.2rem; font-weight: 600; margin-bottom: 0.75rem;
  }
  .bench-disclosure-panel p {
    font-size: 0.95rem; line-height: 1.6; color: #444;
    margin-bottom: 0.75rem;
  }
  .bench-disclosure-panel code {
    background: #f3f3ef; padding: 0.05rem 0.3rem; border-radius: 3px;
    font-size: 0.85rem;
  }
  .bench-disclosure-actions {
    display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 1rem;
  }
  .bench-disclosure-actions button {
    padding: 0.5rem 0.9rem; border-radius: 6px; border: 0;
    font-size: 0.85rem; cursor: pointer;
  }
  .bench-disclosure-actions button[data-bench-disclosure-cancel] {
    background: transparent; color: #555; border: 1px solid #ddd;
  }
  .bench-disclosure-actions button[data-bench-disclosure-confirm] {
    background: #1a1a1a; color: #f7f6f3;
  }
`;

export function buildShareUrl(persona: PersonaShape, origin = "https://bench.dev"): string {
  const handle = persona.handle.replace(/^@/, "");
  if (handle === "anonymous") return `${origin}/`; // demo / unclaimed
  return `${origin}/u/${handle}`;
}

export function tweetIntent(persona: PersonaShape, url: string): string {
  const text = `${persona.hours}h with Claude Code. ${persona.signature}. Bench ${persona.score} · ${persona.tier}. ${url}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function linkedInIntent(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

function fireShareClick(): void {
  plausible("share_click");
}

export function ShareBar({ persona, origin = "https://bench.dev" }: { persona: PersonaShape; origin?: string }) {
  const url = buildShareUrl(persona, origin);
  const [disclosed, setDisclosed] = useState(true); // optimistic until effect runs
  const [pending, setPending] = useState<null | "x" | "linkedin">(null);

  useEffect(() => {
    setDisclosed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function go(target: "x" | "linkedin") {
    fireShareClick();
    const href = target === "x" ? tweetIntent(persona, url) : linkedInIntent(url);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function handleClick(target: "x" | "linkedin") {
    if (disclosed) {
      go(target);
    } else {
      setPending(target);
    }
  }

  function confirmDisclosure() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDisclosed(true);
    if (pending) {
      const t = pending;
      setPending(null);
      go(t);
    }
  }

  return (
    <>
      <style>{shareBarStyles}</style>
      <div className="bench-share-bar" data-bench-share-bar>
        <button type="button" onClick={() => handleClick("x")} data-bench-share="x">
          Share on X
        </button>
        <button type="button" onClick={() => handleClick("linkedin")} data-bench-share="linkedin">
          Share on LinkedIn
        </button>
      </div>
      {pending !== null && (
        <div role="dialog" aria-modal="true" data-bench-disclosure-modal className="bench-disclosure-overlay">
          <div className="bench-disclosure-panel">
            <h2>One-time heads up before you share</h2>
            <p>
              Sharing posts a link to <code>{url}</code>. Once {pending === "x" ? "X" : "LinkedIn"} fetches
              the card preview, it may keep a copy of the image on its servers — even if you later delete
              your bench page. This is how every link preview on the internet works, not a bench-specific quirk.
            </p>
            <p>
              You can still delete your bench profile and the OG image at the bench origin will stop being
              served. Cached copies on external platforms are out of our control.
            </p>
            <p style={{ color: "#888", fontSize: "0.85rem" }}>
              We won&apos;t ask again on this device.
            </p>
            <div className="bench-disclosure-actions">
              <button type="button" onClick={() => setPending(null)} data-bench-disclosure-cancel>
                Cancel
              </button>
              <button type="button" onClick={confirmDisclosure} data-bench-disclosure-confirm>
                Got it, share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ShareBar;

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
  /* Spec §11 mobile NFR: tap targets ≥ 44px.
     Audit §4.4: buttons get depth (inset top-light + drop-shadow) and a
     translateY hover→press response so they feel like physical objects. */
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
    min-width: 140px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 4px 14px rgba(0,0,0,0.30);
    transition:
      background 180ms cubic-bezier(0.22,0.61,0.36,1),
      transform 120ms cubic-bezier(0.22,0.61,0.36,1),
      box-shadow 180ms cubic-bezier(0.22,0.61,0.36,1);
  }
  .bench-share-bar button:hover {
    background: #2a2a2a;
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.10),
      0 6px 20px rgba(0,0,0,0.40);
  }
  .bench-share-bar button:active {
    transform: translateY(0);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 2px 8px rgba(0,0,0,0.30);
  }
  .bench-share-bar button svg { flex: none; }
  @media (prefers-reduced-motion: reduce) {
    .bench-share-bar button { transition: none !important; }
    .bench-share-bar button:hover { transform: none !important; }
  }
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
        <button type="button" onClick={() => handleClick("x")} data-bench-share="x" aria-label="Share on X">
          {/* X (Twitter) glyph, currentColor, monochrome */}
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.16 17.52h1.833L7.084 4.126H5.117z"
              fill="currentColor"
            />
          </svg>
          <span>Share on X</span>
        </button>
        <button type="button" onClick={() => handleClick("linkedin")} data-bench-share="linkedin" aria-label="Share on LinkedIn">
          {/* LinkedIn glyph, currentColor, monochrome */}
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              fill="currentColor"
            />
          </svg>
          <span>Share on LinkedIn</span>
        </button>
      </div>
      {pending !== null && (
        <div role="dialog" aria-modal="true" data-bench-disclosure-modal className="bench-disclosure-overlay">
          <div className="bench-disclosure-panel">
            <h2>One-time heads up before you share</h2>
            <p>
              Sharing posts a link to <code>{url}</code>. Once {pending === "x" ? "X" : "LinkedIn"} fetches
              the card preview, it may keep a copy of the image on its servers, even if you later delete
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

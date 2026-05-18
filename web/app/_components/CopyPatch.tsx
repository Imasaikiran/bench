"use client";

import { useEffect } from "react";

/**
 * CopyPatch — rewrites the static, hardcoded text nodes baked into the FROZEN
 * v1 markup (cli/src/assets/v1-index.html, hash-pinned). v1 cannot be edited,
 * so the v2 layer corrects its copy in the DOM after v1 has painted, the same
 * pattern HeroReveal uses.
 *
 * Every rewrite traces to docs/plans/ui-ux-audit.md.
 *
 * `tier` is passed so the injected tier-definition line is correct for real
 * scans, not only the synthetic demo.
 */

const TIER_BLURB: Record<string, string> = {
  Explorer: "Explorer: just getting started with Claude Code.",
  Tinkerer: "Tinkerer: past the basics, still pruning what doesn't earn its place.",
  Craftsman: "Craftsman: a setup with rhythm — skills, hooks, and rules that fit together.",
  Operator: "Operator: running Claude Code as a system, not a chat box.",
  Conductor: "Conductor: a tuned studio — every part of the setup pulls weight.",
};

export function CopyPatch({ tier }: { tier: string }): null {
  useEffect(() => {
    const run = () => {
      // 1. "hours Claude gave back" → honest, no overclaim (§3.1)
      setText(".bench-label", "hours you've spent with Claude Code");

      // 2. "Bench 62" → "Score 62 / 100" (anchor the number — §3.2)
      const scoreB = document.getElementById("bench-score");
      if (scoreB && scoreB.parentElement) {
        const span = scoreB.parentElement;
        const lead = span.firstChild;
        if (lead && lead.nodeType === Node.TEXT_NODE) {
          lead.textContent = "Score ";
        }
        if (!span.querySelector("[data-bench-outof]")) {
          const outOf = document.createElement("span");
          outOf.setAttribute("data-bench-outof", "1");
          outOf.textContent = " / 100";
          scoreB.insertAdjacentElement("afterend", outOf);
        }
      }

      // 3. "The fastest four moves." → honest, the list has 15 (§3.3)
      setText("#add-title", "What to add next");

      // 4. Drop the "Boris" name-drop; say what the section is (§3.1)
      setText(
        ".add .section-sub",
        "Sourced from widely-shared Claude Code setups. Click a missing one to copy a snippet.",
      );

      // 5. Button copy — say what they do (§3.2)
      setText("#download-art", "Save card (PNG)");
      setText("#share-li", "Share on LinkedIn");

      // 6. Inject a one-line tier definition under the seal (§3.1 — the tier
      //    is never defined anywhere on the page).
      const seal = document.getElementById("atelier-seal");
      if (seal && !document.querySelector("[data-bench-tierdef]")) {
        const def = document.createElement("p");
        def.setAttribute("data-bench-tierdef", "1");
        def.textContent = TIER_BLURB[tier] ?? "";
        def.style.cssText =
          "text-align:center;font-family:ui-sans-serif,system-ui,sans-serif;" +
          "font-size:13px;color:#8a8578;margin:10px 0 0;letter-spacing:0.01em;";
        if (def.textContent) seal.insertAdjacentElement("afterend", def);
      }

      // 7. Chapter legend — two states, defined once (§3.3)
      const strip = document.getElementById("chapters-strip");
      if (strip && !document.querySelector("[data-bench-legend]")) {
        const legend = document.createElement("p");
        legend.setAttribute("data-bench-legend", "1");
        legend.textContent = "Strong = solid. Needs work = your next wins.";
        legend.style.cssText =
          "font-family:ui-monospace,SF Mono,Menlo,monospace;font-size:11px;" +
          "letter-spacing:0.06em;text-transform:uppercase;color:#6b6660;" +
          "margin:14px 0 0;";
        strip.insertAdjacentElement("afterend", legend);
      }
    };

    if (document.readyState === "complete") {
      setTimeout(run, 40);
    } else {
      window.addEventListener("load", () => setTimeout(run, 40), { once: true });
    }
  }, [tier]);

  return null;
}

function setText(selector: string, value: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) el.textContent = value;
}

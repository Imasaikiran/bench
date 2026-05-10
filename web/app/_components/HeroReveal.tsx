"use client";

import { useEffect } from "react";

/**
 * Client-side reveal motion. Mounts inside V1Page and runs once after the
 * v1 script.js has rendered the hero. Effects:
 *
 *  1. Count-up animation on the hero number (.bench-hours): tick from 0 to
 *     the rendered value over ~1.4s with easeOutCubic.
 *  2. Tile strip + must-haves rows fade+rise in a staggered cascade.
 *  3. Chapter dials fill from 0 → their --val over ~900ms with stagger.
 *
 * Respects prefers-reduced-motion: skip all animation, leave final state.
 *
 * Spec: docs/plans/v2-design-audit.md §4.3.
 */
export function HeroReveal(): null {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // The v1 script registers a load-event handler that paints the hero.
    // We chain off the same window load to ensure DOM is final before
    // we read the target value.
    const run = () => {
      animateHeroNumber();
      cascadeFadeIn();
      animateChapterDials();
    };
    if (document.readyState === "complete") {
      // Slight delay so we land after v1's load handler has populated the DOM.
      setTimeout(run, 30);
    } else {
      window.addEventListener("load", () => setTimeout(run, 30), { once: true });
    }
  }, []);

  return null;
}

// ────────────────────── animateHeroNumber ──────────────────────

function animateHeroNumber(): void {
  const el = document.querySelector<HTMLElement>(".bench-hours");
  if (!el) return;
  const finalText = el.textContent ?? "";
  // Parse the integer prefix; preserve any suffix like "h".
  const match = finalText.match(/^(\d+)(.*)$/);
  if (!match) return;
  const target = parseInt(match[1] ?? "0", 10);
  const suffix = match[2] ?? "";
  if (target <= 0) return;

  const duration = 1400;
  const start = performance.now();

  // easeOutCubic — fast acceleration, slow deceleration. The "settling
  // needle" feel called out in the audit §3.
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Capture into a non-null local so the inner closure sees the narrowed type
  // across the requestAnimationFrame boundary.
  const target_el: HTMLElement = el;
  target_el.textContent = `0${suffix}`;
  function frame(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const value = Math.round(target * eased);
    target_el.textContent = `${value}${suffix}`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ────────────────────── cascadeFadeIn ──────────────────────

function cascadeFadeIn(): void {
  // Tile strip across the top: weeks / skills / prompts / plan-mode.
  const tiles = document.querySelectorAll<HTMLElement>(".hs-tile");
  applyStagger(tiles, 80, 380);

  // Must-haves panel rows.
  const mhRows = document.querySelectorAll<HTMLElement>(".mh-item");
  applyStagger(mhRows, 40, 240);
}

function applyStagger(
  els: NodeListOf<HTMLElement>,
  perStepMs: number,
  durationMs: number,
): void {
  els.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition =
      `opacity ${durationMs}ms cubic-bezier(0.22,0.61,0.36,1) ${i * perStepMs}ms,` +
      ` transform ${durationMs}ms cubic-bezier(0.22,0.61,0.36,1) ${i * perStepMs}ms`;
    // Force browser to commit the initial style before applying the target.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  });
}

// ────────────────────── animateChapterDials ──────────────────────

function animateChapterDials(): void {
  const dials = document.querySelectorAll<HTMLElement>(".chapter-dial");
  if (dials.length === 0) return;

  // Each dial uses a CSS custom property --val that drives a conic-gradient
  // in v1 styles.css line ~571. We capture each target, set to 0, then
  // animate up. Stagger 60ms per dial.
  dials.forEach((dial, idx) => {
    const target = parseFloat(dial.style.getPropertyValue("--val")) || 0;
    if (target <= 0) return;
    dial.style.setProperty("--val", "0");

    const start = performance.now() + idx * 60;
    const duration = 900;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function frame(now: number) {
      if (now < start) {
        requestAnimationFrame(frame);
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      const value = target * easeOutCubic(t);
      dial.style.setProperty("--val", String(value));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

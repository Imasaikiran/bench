// web/test/plausible.test.ts
// Tests for the typed Plausible event wrapper.
// Environment: node (vitest default).
//
// The plausible() helper guards on `typeof window === "undefined"` for SSR
// safety. In node that guard fires, making every call a no-op — which is
// exactly the SSR guarantee we want. We test:
//   1. The SSR no-op: calling plausible() in a node env never throws.
//   2. The browser path: simulate a browser by temporarily assigning
//      globalThis.window = globalThis (cheap, no jsdom dependency), then
//      set globalThis.plausible to a spy.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { plausible } from "../lib/plausible";

// Helpers to simulate browser vs server environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = Record<string, any>;

function simulateBrowser(): void {
  // Assign window = globalThis to make `typeof window` evaluate as "object"
  // (not "undefined") — simulating a browser environment without jsdom.
  (globalThis as G)["window"] = globalThis;
}

function simulateServer(): void {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (globalThis as G)["window"];
}

describe("plausible() — SSR (node/no-window)", () => {
  beforeEach(() => simulateServer());
  afterEach(() => simulateServer());

  it("no-ops when window is undefined (SSR safety)", () => {
    expect(() => plausible("share_click")).not.toThrow();
  });

  it("does not call globalThis.plausible when window is absent", () => {
    const spy = vi.fn();
    (globalThis as G)["plausible"] = spy;
    plausible("share_click");
    expect(spy).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as G)["plausible"];
  });
});

describe("plausible() — browser (window = globalThis)", () => {
  beforeEach(() => {
    simulateBrowser();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as G)["plausible"];
  });
  afterEach(() => {
    simulateServer();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as G)["plausible"];
  });

  it("no-ops when window.plausible is undefined", () => {
    expect(() => plausible("share_click")).not.toThrow();
  });

  it("calls window.plausible with event name only", () => {
    const spy = vi.fn();
    (globalThis as G)["plausible"] = spy;
    plausible("share_click");
    expect(spy).toHaveBeenCalledWith("share_click");
  });

  it("passes props option when provided", () => {
    const spy = vi.fn();
    (globalThis as G)["plausible"] = spy;
    plausible("scan_upload", { tier: "Tinkerer", score: 62 });
    expect(spy).toHaveBeenCalledWith("scan_upload", { props: { tier: "Tinkerer", score: 62 } });
  });

  // Spec §11.1 — every event listed in the post-launch metrics table must be
  // typed in PlausibleEvent. If the spec adds an event, this test forces a
  // compile-time + runtime catch.
  it("accepts every spec §11.1 event name without TS error", () => {
    const spy = vi.fn();
    (globalThis as G)["plausible"] = spy;
    plausible("scan_upload");
    plausible("claim_complete");
    plausible("share_click");
    plausible("delete_complete");
    plausible("rescan_detect");
    plausible("feedback_submit");
    expect(spy).toHaveBeenCalledTimes(6);
  });
});

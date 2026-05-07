// web/test/feedback-form.test.ts
// Pure-function tests for FeedbackForm helpers. No jsdom — vitest env is "node".
// React modal interaction is covered by the route-level test (api-feedback.test.ts).
import { describe, it, expect } from "vitest";
import {
  buildFeedbackPayload,
  isPayloadSubmittable,
  ShortStatusMessage,
} from "../app/_components/FeedbackForm";

describe("buildFeedbackPayload", () => {
  it("trims whitespace from reason", () => {
    const p = buildFeedbackPayload("scan_a", "hours", "  too low  ");
    expect(p.reason).toBe("too low");
  });

  it("clamps reason to 500 chars", () => {
    const long = "x".repeat(700);
    const p = buildFeedbackPayload("scan_a", "tier", long);
    expect(p.reason.length).toBe(500);
  });

  it("normalises empty dimension to null", () => {
    const p = buildFeedbackPayload("scan_a", "", "wrong");
    expect(p.dimension).toBeNull();
  });

  it("normalises whitespace-only dimension to null", () => {
    const p = buildFeedbackPayload("scan_a", "   ", "wrong");
    expect(p.dimension).toBeNull();
  });

  it("preserves a populated dimension verbatim", () => {
    const p = buildFeedbackPayload("scan_a", "Foundation", "x");
    expect(p.dimension).toBe("Foundation");
  });

  it("threads scan_id through unchanged", () => {
    const p = buildFeedbackPayload("scan_xyz", "score", "msg");
    expect(p.scan_id).toBe("scan_xyz");
  });
});

describe("isPayloadSubmittable", () => {
  it("rejects empty scan_id", () => {
    expect(isPayloadSubmittable({ scan_id: "", dimension: null, reason: "x" })).toBe(false);
  });

  it("rejects empty reason", () => {
    expect(isPayloadSubmittable({ scan_id: "a", dimension: null, reason: "" })).toBe(false);
  });

  it("accepts both populated", () => {
    expect(isPayloadSubmittable({ scan_id: "a", dimension: null, reason: "x" })).toBe(true);
  });

  it("accepts populated dimension and reason", () => {
    expect(isPayloadSubmittable({ scan_id: "a", dimension: "hours", reason: "x" })).toBe(true);
  });
});

describe("ShortStatusMessage", () => {
  it("returns a friendly thanks on ok", () => {
    expect(ShortStatusMessage("ok")).toMatch(/thanks/i);
  });

  it("returns a retry hint on error", () => {
    expect(ShortStatusMessage("error")).toMatch(/again/i);
  });

  it("returns a rate-limit message on rate_limited", () => {
    expect(ShortStatusMessage("rate_limited")).toMatch(/too many|wait|few minutes/i);
  });

  it("returns a not-found explainer on not_found", () => {
    expect(ShortStatusMessage("not_found")).toMatch(/no longer|refresh/i);
  });
});

describe("payload contract — matches /api/feedback zod schema", () => {
  // These shapes must round-trip through web/app/api/feedback/route.ts feedbackSchema.
  // If the route schema changes, this test will surface the drift via the Zod unit
  // tests in api-feedback.test.ts — but we keep this guard so a refactor of the form
  // helper alone can't silently break the wire format.
  it("produces a body with exactly the three required keys", () => {
    const p = buildFeedbackPayload("scan_a", "tier", "wrong tier");
    expect(Object.keys(p).sort()).toEqual(["dimension", "reason", "scan_id"]);
  });

  it("dimension can be null per schema (z.union([z.string(), z.null()]).optional())", () => {
    const p = buildFeedbackPayload("scan_a", "", "x");
    expect(p.dimension).toBeNull();
  });
});

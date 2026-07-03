import { describe, it, expect } from "vitest";
import { sessionConfidence } from "../../src/scanner/confidence";

describe("sessionConfidence", () => {
  it("is low when sessions parsed but zero tool_use blocks were seen", () => {
    expect(sessionConfidence({ sessionsTotal: 200, toolUseCount: 0 })).toBe("low");
  });
  it("is high when tool_use blocks were seen", () => {
    expect(sessionConfidence({ sessionsTotal: 200, toolUseCount: 5000 })).toBe("high");
  });
  it("is unknown when no sessions exist at all", () => {
    expect(sessionConfidence({ sessionsTotal: 0, toolUseCount: 0 })).toBe("unknown");
  });
});

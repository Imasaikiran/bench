import { describe, it, expect } from "vitest";
import { main, isDirectInvocation } from "../src/index";

describe("CLI smoke", () => {
  it("main() exists and is async", () => {
    expect(typeof main).toBe("function");
    expect(main.constructor.name).toBe("AsyncFunction");
  });

  it("--version prints scanner + rubric version", async () => {
    const lines: string[] = [];
    await main(["--version"], { stdout: (s) => lines.push(s) });
    expect(lines.join("\n")).toMatch(/bench v\d+\.\d+\.\d+-alpha/);
    expect(lines.join("\n")).toMatch(/rubric v\d+\.\d+\.\d+/);
  });
});

describe("isDirectInvocation", () => {
  it("matches when import.meta.url equals pathToFileURL(argv1).href", () => {
    const argv1 = "/Users/dev/bench/cli/dist/index.js";
    expect(
      isDirectInvocation("file:///Users/dev/bench/cli/dist/index.js", argv1),
    ).toBe(true);
  });

  it("matches when path contains spaces (URL-encoded by pathToFileURL)", () => {
    // Repro of the bug fixed here: previously `file://${argv1}` left the
    // space literal, while import.meta.url percent-encodes it. The helper
    // normalises both sides via pathToFileURL.
    const argv1 = "/Users/sai/Claud Workspace/bench/cli/dist/index.js";
    const metaUrl =
      "file:///Users/sai/Claud%20Workspace/bench/cli/dist/index.js";
    expect(isDirectInvocation(metaUrl, argv1)).toBe(true);
  });

  it("returns false when argv1 is undefined", () => {
    expect(isDirectInvocation("file:///x.js", undefined)).toBe(false);
  });

  it("returns false when entry does not match", () => {
    expect(
      isDirectInvocation("file:///a/index.js", "/b/index.js"),
    ).toBe(false);
  });
});

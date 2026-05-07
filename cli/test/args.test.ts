import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/args";

describe("parseArgs", () => {
  it("returns all-false defaults for empty argv", () => {
    const a = parseArgs([]);
    expect(a.version).toBe(false);
    expect(a.why).toBe(false);
    expect(a.offline).toBe(false);
    expect(a.handle).toBe(null);
    expect(a.debug).toBe(false);
    expect(a.dryRun).toBe(false);
    expect(a.rubric).toBe(null);
  });

  it("--version sets version: true", () => {
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  it("--why sets why: true", () => {
    expect(parseArgs(["--why"]).why).toBe(true);
  });

  it("--offline sets offline: true", () => {
    expect(parseArgs(["--offline"]).offline).toBe(true);
  });

  it("--debug sets debug: true", () => {
    expect(parseArgs(["--debug"]).debug).toBe(true);
  });

  it("--dry-run sets dryRun: true", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it("--handle alice sets handle: 'alice'", () => {
    expect(parseArgs(["--handle", "alice"]).handle).toBe("alice");
  });

  it("--rubric ./r.yaml sets rubric: './r.yaml'", () => {
    expect(parseArgs(["--rubric", "./r.yaml"]).rubric).toBe("./r.yaml");
  });

  it("multiple flags together", () => {
    const a = parseArgs([
      "--why",
      "--offline",
      "--handle",
      "bob",
      "--debug",
      "--dry-run",
    ]);
    expect(a.why).toBe(true);
    expect(a.offline).toBe(true);
    expect(a.handle).toBe("bob");
    expect(a.debug).toBe(true);
    expect(a.dryRun).toBe(true);
  });

  it("unknown flag throws", () => {
    expect(() => parseArgs(["--unknown"])).toThrow("unknown flag: --unknown");
  });

  it("--handle missing value throws", () => {
    expect(() => parseArgs(["--handle"])).toThrow("--handle requires a value");
  });

  it("--handle --version (value starts with --) throws", () => {
    expect(() => parseArgs(["--handle", "--version"])).toThrow(
      "--handle requires a value",
    );
  });

  it("--rubric missing value throws", () => {
    expect(() => parseArgs(["--rubric"])).toThrow("--rubric requires a value");
  });

  it("--rubric --why (value starts with --) throws", () => {
    expect(() => parseArgs(["--rubric", "--why"])).toThrow(
      "--rubric requires a value",
    );
  });
});

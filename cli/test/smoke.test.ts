import { describe, it, expect } from "vitest";
import { main } from "../src/index";

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

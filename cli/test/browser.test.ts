import { describe, it, expect, vi } from "vitest";
import { openCommand, openUrl } from "../src/browser";

// Explicit type alias for the mock — no `any` leakage.
type SpawnMock = (...args: Parameters<typeof import("node:child_process").spawn>) => { unref: () => void };

describe("openCommand", () => {
  it("darwin uses open", () => {
    expect(openCommand("darwin", "https://x")).toEqual(["open", ["https://x"]]);
  });

  it("win32 uses cmd /c start", () => {
    expect(openCommand("win32", "https://x")).toEqual([
      "cmd",
      ["/c", "start", "", "https://x"],
    ]);
  });

  it("linux uses xdg-open", () => {
    expect(openCommand("linux", "https://x")).toEqual(["xdg-open", ["https://x"]]);
  });

  it("unknown platform throws", () => {
    expect(() => openCommand("freebsd", "https://x")).toThrow(
      /unsupported platform/,
    );
  });

  it("rejects non-http url (file://)", () => {
    expect(() => openCommand("darwin", "file:///etc/passwd")).toThrow(
      /invalid url/,
    );
  });

  it("rejects javascript: url", () => {
    expect(() => openCommand("darwin", "javascript:alert(1)")).toThrow(
      /invalid url/,
    );
  });
});

describe("openUrl", () => {
  it("wires spawn with correct arguments on darwin", () => {
    const unref = vi.fn();
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref });

    openUrl("https://example.com", { platform: "darwin", spawn: spawnMock });

    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock).toHaveBeenCalledWith(
      "open",
      ["https://example.com"],
      { stdio: "ignore", detached: true },
    );
  });

  it("calls .unref() on the child process", () => {
    const unref = vi.fn();
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref });

    openUrl("https://example.com", { platform: "linux", spawn: spawnMock });

    expect(unref).toHaveBeenCalledOnce();
  });

  it("wraps spawn errors with a descriptive message", () => {
    const spawnMock = vi.fn<SpawnMock>().mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });

    expect(() =>
      openUrl("https://example.com", { platform: "darwin", spawn: spawnMock }),
    ).toThrow(/failed to open browser/);

    expect(() =>
      openUrl("https://example.com", { platform: "darwin", spawn: spawnMock }),
    ).toThrow(/spawn ENOENT/);
  });
});

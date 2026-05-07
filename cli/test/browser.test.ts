import { describe, it, expect, vi } from "vitest";
import { openCommand, openUrl } from "../src/browser";

// Explicit type alias for the mock — no `any` leakage.
type SpawnMock = (...args: Parameters<typeof import("node:child_process").spawn>) => { unref: () => void; on: (event: string, listener: (err: Error) => void) => void };

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

  it("URL guard precedes platform guard", () => {
    expect(() => openCommand("freebsd" as NodeJS.Platform, "javascript:x")).toThrow(/invalid url/);
  });
});

describe("openUrl", () => {
  it("wires spawn with correct arguments on darwin", () => {
    const unref = vi.fn();
    const on = vi.fn();
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref, on });

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
    const on = vi.fn();
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref, on });

    openUrl("https://example.com", { platform: "linux", spawn: spawnMock });

    expect(unref).toHaveBeenCalledOnce();
  });

  it("wraps spawn errors with a descriptive message", () => {
    const originalErr = new Error("spawn ENOENT");
    const spawnMock = vi.fn<SpawnMock>().mockImplementation(() => {
      throw originalErr;
    });

    let thrownErr: Error | undefined;
    try {
      openUrl("https://example.com", { platform: "darwin", spawn: spawnMock });
    } catch (e) {
      thrownErr = e as Error;
    }

    expect(thrownErr).toBeDefined();
    expect(thrownErr!.message).toMatch(/failed to open browser/);
    expect((thrownErr! as Error & { cause: unknown }).cause).toBe(originalErr);
    expect((thrownErr!.cause as Error).message).toBe("spawn ENOENT");
  });

  it("attaches an 'error' listener to the child process", () => {
    const unref = vi.fn();
    const on = vi.fn();
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref, on });

    openUrl("https://example.com", { platform: "darwin", spawn: spawnMock });

    expect(on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("error listener does not throw when called with an error", () => {
    const unref = vi.fn();
    let capturedListener: ((err: Error) => void) | undefined;
    const on = vi.fn<(event: string, listener: (err: Error) => void) => void>(
      (_event, listener) => { capturedListener = listener; },
    );
    const spawnMock = vi.fn<SpawnMock>().mockReturnValue({ unref, on });

    openUrl("https://example.com", { platform: "darwin", spawn: spawnMock });

    expect(() => capturedListener!(new Error("ENOENT"))).not.toThrow();
  });
});

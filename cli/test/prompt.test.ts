import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test ttyPrompt by mocking the readline/promises module.
// This avoids touching real stdin/stdout in the test environment.

describe("ttyPrompt", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first line when answer is not 'show'", async () => {
    const mockQuestion = vi.fn().mockResolvedValue("y");
    const mockClose = vi.fn();

    vi.doMock("node:readline/promises", () => ({
      createInterface: () => ({
        question: mockQuestion,
        close: mockClose,
      }),
    }));

    const { ttyPrompt } = await import("../src/prompt");
    const result = await ttyPrompt();

    expect(result).toBe("y");
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it("returns just the first line when answer is empty (default N)", async () => {
    const mockQuestion = vi.fn().mockResolvedValue("");
    const mockClose = vi.fn();

    vi.doMock("node:readline/promises", () => ({
      createInterface: () => ({
        question: mockQuestion,
        close: mockClose,
      }),
    }));

    const { ttyPrompt } = await import("../src/prompt");
    const result = await ttyPrompt();

    expect(result).toBe("");
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it("returns 'show\\ny' when first line is 'show' and second is 'y'", async () => {
    const mockQuestion = vi
      .fn()
      .mockResolvedValueOnce("show")
      .mockResolvedValueOnce("y");
    const mockClose = vi.fn();

    vi.doMock("node:readline/promises", () => ({
      createInterface: () => ({
        question: mockQuestion,
        close: mockClose,
      }),
    }));

    const { ttyPrompt } = await import("../src/prompt");
    const result = await ttyPrompt();

    expect(result).toBe("show\ny");
    expect(mockQuestion).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it("asks the right prompts in the right order", async () => {
    const prompts: string[] = [];
    const mockQuestion = vi.fn().mockImplementation((prompt: string) => {
      prompts.push(prompt);
      return Promise.resolve(prompt.includes("show") ? "show" : "n");
    });
    const mockClose = vi.fn();

    vi.doMock("node:readline/promises", () => ({
      createInterface: () => ({
        question: mockQuestion,
        close: mockClose,
      }),
    }));

    const { ttyPrompt } = await import("../src/prompt");
    await ttyPrompt();

    expect(prompts[0]).toContain("show to list redactions");
    expect(prompts[1]).toContain("upload? [y/N]:");
  });

  it("closes the readline interface even when answer is not 'show'", async () => {
    const mockQuestion = vi.fn().mockResolvedValue("n");
    const mockClose = vi.fn();

    vi.doMock("node:readline/promises", () => ({
      createInterface: () => ({
        question: mockQuestion,
        close: mockClose,
      }),
    }));

    const { ttyPrompt } = await import("../src/prompt");
    await ttyPrompt();

    expect(mockClose).toHaveBeenCalledOnce();
  });
});

// cli/test/consent-roundtrip.test.ts
//
// Round-trip smoke test: spawn the built CLI binary against a tiny in-process
// http.createServer that pretends to be /api/scan. Drive stdin with `y\n` to
// consent. Assert exit code, stdout, and that the server received exactly the
// payload shape we expect.
//
// This is the in-process e2e — distinct from cli/test/e2e.test.ts which
// targets a deployed bench.dev. That test stays .skip'd; this one runs in CI.
//
// Test gates that exist purely for this harness:
//   - BENCH_API_BASE — loopback-only override of /api/scan endpoint.
//     Validated in src/uploader.ts (host must be 127.0.0.1 / localhost).
//   - BENCH_NO_OPEN  — skip spawning a real browser via openUrl.

import { describe, it, expect } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveEndpoint } from "../src/uploader";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const CLI_DIST = resolve(REPO_ROOT, "cli", "dist", "index.js");
const FIXTURE_TINKERER = resolve(REPO_ROOT, "cli", "test", "fixtures", "tinkerer");

// This is a build-artifact-dependent integration test: it spawns the built
// CLI binary. If cli/dist is absent (clean checkout, no build), skip the
// whole suite rather than hard-fail the unit run. CI builds the CLI before
// `pnpm test` (.github/workflows/ci.yml), so in CI this runs for real.
const HAS_BUILD = existsSync(CLI_DIST) && existsSync(FIXTURE_TINKERER);
const suite = HAS_BUILD ? describe : describe.skip;

type ServerHarness = {
  server: Server;
  port: number;
  hits: Array<{ method: string; url: string; body: string }>;
  close: () => Promise<void>;
};

async function startMockServer(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
): Promise<ServerHarness> {
  const hits: ServerHarness["hits"] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      hits.push({ method: req.method ?? "?", url: req.url ?? "?", body });
      handler(req, res, body);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    server,
    port,
    hits,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

type RunOpts = { stdinReply?: string };

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function runCli(env: NodeJS.ProcessEnv, opts: RunOpts = {}): Promise<RunResult> {
  const child: ChildProcessWithoutNullStreams = spawn(
    "node",
    [CLI_DIST],
    {
      env: { ...process.env, ...env, BENCH_NO_OPEN: "1" },
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  // Deterministic stdin: wait until the consent prompt actually appears on
  // stdout, THEN write the reply exactly once. A blind setTimeout raced on
  // slower CI runners — the reply landed before/after the prompt window and
  // the CLI re-read stdin, double-firing the upload. Watch for the prompt
  // marker instead. The prompt ends with "[y/N]" (see cli/src/consent.ts).
  let replied = false;
  const PROMPT_RE = /\[y\/N\]/i;

  function maybeReply(acc: string): void {
    if (replied || opts.stdinReply === undefined) return;
    if (PROMPT_RE.test(acc)) {
      replied = true;
      child.stdin.write(opts.stdinReply);
      child.stdin.end();
    }
  }

  child.stdout.on("data", (c: Buffer) => {
    stdoutChunks.push(c);
    maybeReply(Buffer.concat(stdoutChunks).toString("utf8"));
  });
  child.stderr.on("data", (c: Buffer) => stderrChunks.push(c));

  if (opts.stdinReply === undefined) {
    child.stdin.end();
  } else {
    // Safety net: if the prompt never prints (scan error path), close stdin
    // after the process is clearly done waiting so the child can exit.
    child.on("exit", () => {
      if (!replied) {
        try {
          child.stdin.end();
        } catch {
          /* already closed */
        }
      }
    });
  }

  return new Promise<RunResult>((res) => {
    child.on("close", (code) => {
      res({
        exitCode: code ?? -1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

// ---------------------------------------------------------------------------

describe("uploader resolveEndpoint env override (security boundary)", () => {
  it("falls back to production endpoint when no env is set", () => {
    expect(resolveEndpoint(undefined)).toBe("https://bench.dev/api/scan");
  });

  it("accepts a 127.0.0.1 base", () => {
    expect(resolveEndpoint("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321/api/scan",
    );
  });

  it("accepts a localhost base", () => {
    expect(resolveEndpoint("http://localhost:3001")).toBe(
      "http://localhost:3001/api/scan",
    );
  });

  it("accepts a URL that already ends in /api/scan", () => {
    expect(resolveEndpoint("http://127.0.0.1:54321/api/scan")).toBe(
      "http://127.0.0.1:54321/api/scan",
    );
  });

  it("REJECTS an external host (data-exfiltration guard)", () => {
    expect(() => resolveEndpoint("https://evil.example.com/api/scan")).toThrow(
      /loopback/i,
    );
  });

  it("REJECTS a non-URL string", () => {
    expect(() => resolveEndpoint("not-a-url")).toThrow(/valid url/i);
  });
});

// ---------------------------------------------------------------------------

suite("CLI consent → upload round-trip (in-process mock server)", () => {
  it("y → POSTs the payload, prints the URL, exits 0", async () => {
    const harness = await startMockServer((req, res, _body) => {
      if (req.method === "POST" && req.url === "/api/scan") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          id: "test_abc",
          url: `http://127.0.0.1:${harness.port}/scan/test_abc`,
        }));
        return;
      }
      // Browser-launch path is gated by BENCH_NO_OPEN=1 so it never hits this.
      res.writeHead(404).end();
    });

    try {
      const result = await runCli(
        { CLAUDE_HOME: FIXTURE_TINKERER, BENCH_API_BASE: `http://127.0.0.1:${harness.port}` },
        { stdinReply: "y\n" },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("test_abc");
      expect(harness.hits.length).toBe(1);
      const hit = harness.hits[0];
      expect(hit?.method).toBe("POST");
      expect(hit?.url).toBe("/api/scan");
      const body = JSON.parse(hit?.body ?? "{}");
      expect(body.tier).toBeDefined();
      expect(typeof body.score).toBe("number");
      expect(body.integrity?.client_hmac).toBeTypeOf("string");
      expect((body.integrity?.client_hmac as string).length).toBeGreaterThan(20);
    } finally {
      await harness.close();
    }
  }, 30_000);

  it("N → skips upload, writes local files, exits 0, server saw zero POSTs", async () => {
    const harness = await startMockServer((_req, res) => {
      res.writeHead(500).end(); // shouldn't be hit
    });

    try {
      const result = await runCli(
        { CLAUDE_HOME: FIXTURE_TINKERER, BENCH_API_BASE: `http://127.0.0.1:${harness.port}` },
        { stdinReply: "n\n" },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("not uploaded");
      expect(harness.hits.length).toBe(0);
    } finally {
      await harness.close();
    }
  }, 30_000);

  it("server 500s every attempt → CLI retries 3×, then writes local files, exits 1", async () => {
    let attempts = 0;
    const harness = await startMockServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/scan") {
        attempts++;
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("upstream down");
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const result = await runCli(
        { CLAUDE_HOME: FIXTURE_TINKERER, BENCH_API_BASE: `http://127.0.0.1:${harness.port}` },
        { stdinReply: "y\n" },
      );

      // After MAX_ATTEMPTS=3 server errors, uploader.ts throws + index.ts
      // catches, writes local files, returns 1 (per spec §9 N8/N9).
      expect(result.exitCode).toBe(1);
      expect(attempts).toBe(3);
      expect(result.stderr.toLowerCase()).toMatch(/upload failed|writing local/);
    } finally {
      await harness.close();
    }
  }, 60_000);
});

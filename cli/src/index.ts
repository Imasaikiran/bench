#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const VERSION = "0.0.1-alpha.0";

type IO = { stdout?: (s: string) => void; stderr?: (s: string) => void };

export async function main(argv: string[], io: IO = {}): Promise<number> {
  const out = io.stdout ?? ((s) => process.stdout.write(s + "\n"));
  if (argv.includes("--version")) {
    const pkgDir = dirname(fileURLToPath(import.meta.url));
    const rubricPath = resolve(pkgDir, "..", "rubric.yaml");
    const rubricText = readFileSync(rubricPath, "utf8");
    const m = rubricText.match(/version:\s*"(\d+\.\d+\.\d+)"/);
    out(`bench v${VERSION}`);
    out(`rubric v${m?.[1] ?? "unknown"}`);
    return 0;
  }
  out("scanner not yet implemented — see docs/plans/.../task-1.x");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}

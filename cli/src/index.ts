#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { load } from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(here, "..", "package.json"), "utf8"),
) as { version: string };

export const VERSION: string = pkg.version;

export type IO = {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
};

/**
 * True when this module is being invoked directly as a script (i.e. as the
 * `bench` bin), rather than imported. URL-encodes argv1 so paths containing
 * spaces (e.g. "/Users/.../Claud Workspace/...") still match.
 */
export function isDirectInvocation(
  metaUrl: string,
  argv1: string | undefined,
): boolean {
  if (!argv1) return false;
  return metaUrl === pathToFileURL(argv1).href;
}

function readRubricVersion(rubricPath: string): string {
  try {
    const parsed = load(readFileSync(rubricPath, "utf8")) as
      | { version?: string }
      | null;
    return parsed?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function main(argv: string[], io: IO = {}): Promise<number> {
  const out = io.stdout ?? ((s) => process.stdout.write(s + "\n"));
  if (argv.includes("--version")) {
    const rubricPath = resolve(here, "..", "rubric.yaml");
    out(`bench v${VERSION}`);
    out(`rubric v${readRubricVersion(rubricPath)}`);
    return 0;
  }
  out("scanner not yet implemented");
  return 0;
}

if (isDirectInvocation(import.meta.url, process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}

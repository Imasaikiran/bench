import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

export function isWithinAllowedPrefixes(p: string, prefixes: string[]): boolean {
  const abs = resolve(p);
  return prefixes.some((pre) => {
    const preAbs = resolve(pre);
    return abs === preAbs || abs.startsWith(preAbs + sep);
  });
}

export function resolveSafely(p: string, prefixes: string[]): string | null {
  try {
    const real = realpathSync(p);
    return isWithinAllowedPrefixes(real, prefixes) ? real : null;
  } catch {
    return null;
  }
}

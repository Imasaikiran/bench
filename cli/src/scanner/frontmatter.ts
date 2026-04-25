import { load as yamlLoad } from "js-yaml";

// CRLF-safe (#6): tolerates Windows-authored frontmatter.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** Parse YAML frontmatter delimited by `---` lines. Returns `{}` on miss/parse error. */
export function parseFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return {};
  try {
    const parsed = yamlLoad(m[1] ?? "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

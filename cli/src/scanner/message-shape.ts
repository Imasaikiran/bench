export type NormalizedEntry = {
  role: string | null;
  content: unknown[] | null;
  timestamp: string | null;
  cwd: string | null;
};

/**
 * Claude Code writes session JSONL where assistant/user turns nest role+content
 * under `message`, with `type` at the top level (`type: "assistant"`). Older or
 * synthetic fixtures may put role/content at the top level. Operation lines
 * (compaction, summaries) carry neither. This is the ONLY place that knows the
 * envelope shape — every scanner reads through it.
 */
export function normalizeEntry(raw: Record<string, unknown>): NormalizedEntry {
  const msg =
    raw["message"] && typeof raw["message"] === "object" && !Array.isArray(raw["message"])
      ? (raw["message"] as Record<string, unknown>)
      : raw;

  const role =
    typeof msg["role"] === "string"
      ? msg["role"]
      : typeof raw["type"] === "string" && (raw["type"] === "assistant" || raw["type"] === "user")
        ? raw["type"]
        : null;

  const content = Array.isArray(msg["content"]) ? (msg["content"] as unknown[]) : null;
  const timestamp = typeof raw["timestamp"] === "string" ? raw["timestamp"] : null;
  const cwd = typeof raw["cwd"] === "string" ? raw["cwd"] : null;

  return { role, content, timestamp, cwd };
}

export type Confidence = "high" | "low" | "unknown";

/**
 * If we parsed many sessions but saw zero tool_use blocks, our reader is
 * almost certainly mis-shaped for this machine — signals derived from tool_use
 * (skills_active, plan-mode, automation) must render as "couldn't verify",
 * never as "missing" (an accusation).
 */
export function sessionConfidence(x: { sessionsTotal: number; toolUseCount: number }): Confidence {
  if (x.sessionsTotal === 0) return "unknown";
  if (x.toolUseCount === 0) return "low";
  return "high";
}

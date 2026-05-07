import { createHmac, timingSafeEqual } from "node:crypto";
import type { Payload } from "./schema";

// NOT a secret — friction only. See rubric §10.3 item 10.
const BUNDLED_HMAC_KEY = "bench-v1-integrity-key-public-do-not-treat-as-secret";

export function canonicalJson(v: unknown): string {
  if (v === undefined) throw new Error("canonicalJson: undefined value not representable");
  if (v === null) return "null";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("canonicalJson: non-finite number not representable");
    return JSON.stringify(v);
  }
  if (typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

export function verifyClientHmac(payload: Payload): boolean {
  try {
    const expected = createHmac("sha256", BUNDLED_HMAC_KEY)
      .update(canonicalJson(payload.counts))
      .digest("hex");
    const provided = payload.integrity.client_hmac;
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

/** Compute HMAC for a counts object — used in tests. */
export function computeHmac(counts: Record<string, unknown>): string {
  return createHmac("sha256", BUNDLED_HMAC_KEY)
    .update(canonicalJson(counts))
    .digest("hex");
}

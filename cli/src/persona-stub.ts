import type { Payload } from "./payload.js";

// TODO(1.22): replace with real PersonaShape mapper from §7.2.
// This forward-stub exists so the pipeline compiles end-to-end before
// Task 1.22 ships the actual PersonaShape type and mapping logic.

/**
 * Maps an assembled Payload to the PersonaShape expected by the local-export
 * renderer and the bench.dev API.
 *
 * NOTE: This is a forward-stub for Task 1.22. The returned object is typed as
 * `unknown` so callers (writeLocalExport, upload) remain decoupled from the
 * PersonaShape type until it is finalised.
 */
export function mapperToPersona(payload: Payload): unknown {
  return {
    score: payload.score,
    tier: payload.tier,
    handle: payload.handle,
    identity: payload.identity,
    signature_verbs: payload.signature_verbs,
    hours: payload.hours_with_cc,
    hours_meaning: payload.hours_meaning,
    chapters: payload.chapters,
  };
}

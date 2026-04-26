import { z } from "zod";

export const CURRENT_SCHEMA = "1.0";
// Widen this when shipping a new schema while preserving back-compat for one
// minor version. Today: only "1.0" is live.
export const SUPPORTED_SCHEMAS = ["1.0"] as const;
// Kept for back-compat with route imports that referenced MIN_SCHEMA.
export const MIN_SCHEMA = SUPPORTED_SCHEMAS[0];

const stateSchema = z.enum(["have", "partial", "missing"]);
const chapterTagSchema = z.enum(["strong", "partial", "weak"]);
const chapterSchema = z.object({ score: z.number(), states: z.array(stateSchema) });
const tileSchema = z.object({ label: z.string(), value: z.string(), equiv: z.string() });

export const payloadSchema = z.object({
  schema_version: z.string(),
  rubric_version: z.string(),
  scanner_version: z.string(),
  scanned_at: z.string(),
  handle: z.union([z.string(), z.null()]),
  previous_scan_id: z.union([z.string(), z.null()]),
  os: z.string(),
  node_version: z.string(),
  tier: z.enum(["Explorer", "Tinkerer", "Craftsman", "Operator", "Conductor"]),
  score: z.number().int().min(0).max(100),
  weeks_on_cc: z.number().int().min(0),
  hours_with_cc: z.union([z.number(), z.null()]),
  hours_hidden: z.boolean(),
  counts: z.record(z.unknown()),
  chapters: z.object({
    Foundation: chapterSchema,
    Automation: chapterSchema,
    Delegation: chapterSchema,
    Craft: chapterSchema,
    Coherence: chapterSchema,
  }),
  chapter_tags: z.array(chapterTagSchema).length(5),
  musthaves: z.array(stateSchema).length(15),
  signature_verbs: z.array(z.string()),
  tiles: z.array(tileSchema),
  identity: z.string(),
  hours_meaning: z.string(),
  hours_label: z.string(),
  chapter_note: z.string(),
  diagnostics: z.record(z.unknown()),
  integrity: z.object({ client_hmac: z.string(), hmac_key_id: z.literal("v1") }),
});

export type Payload = z.infer<typeof payloadSchema>;

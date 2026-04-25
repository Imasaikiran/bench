import type { RedactionHit } from "./redactor.js";

export type ConsentInput = {
  redactionHits: number;
  hits?: RedactionHit[];
};

export type ConsentOutput = {
  upload: boolean;
  shownRedactions?: boolean;
};

export type Prompter = () => Promise<string>;

function isYes(answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return a === "y" || a === "yes";
}

export async function askConsent(
  input: ConsentInput,
  prompter: Prompter,
  sink?: (hits: RedactionHit[]) => void,
): Promise<ConsentOutput> {
  const raw = await prompter();
  const lines = raw.split("\n");
  const first = (lines[0] ?? "").trim();

  if (first.toLowerCase() === "show") {
    sink?.(input.hits ?? []);
    const second = (lines[1] ?? "").trim();
    const upload = isYes(second);
    return { upload, shownRedactions: true };
  }

  const upload = isYes(first);
  return { upload };
}

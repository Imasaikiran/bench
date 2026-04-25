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
  return a === "y" || a.startsWith("y");
}

export async function askConsent(
  input: ConsentInput,
  prompter: Prompter,
): Promise<ConsentOutput> {
  const raw = await prompter();
  const lines = raw.split("\n");
  const first = (lines[0] ?? "").trim();

  if (first.toLowerCase() === "show") {
    const second = (lines[1] ?? "").trim();
    const upload = isYes(second);
    return upload ? { upload, shownRedactions: true } : { upload: false, shownRedactions: true };
  }

  const upload = isYes(first);
  return { upload };
}

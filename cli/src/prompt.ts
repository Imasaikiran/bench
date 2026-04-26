import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";

/**
 * Prompt the user via TTY for upload consent.
 *
 * Implements the multi-line contract expected by `askConsent` (Task 1.15):
 *   - Ask "upload? [y/N] (show to list redactions): "
 *   - If the first answer (trimmed, lowercased) is "show", ask a follow-up
 *     "upload? [y/N]: " and return both lines joined by "\n".
 *   - Otherwise return just the first line.
 *
 * The caller (askConsent) is responsible for interpreting "show" and the
 * y/n answers — this function only handles I/O.
 *
 * Note: Do NOT call process.stdin.setRawMode — readline handles terminal mode.
 */
export async function ttyPrompt(): Promise<string> {
  const rl: Interface = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const first = await rl.question(
      "upload? [y/N] (show to list redactions): ",
    );

    if (first.trim().toLowerCase() === "show") {
      const second = await rl.question("upload? [y/N]: ");
      return first + "\n" + second;
    }

    return first;
  } finally {
    rl.close();
  }
}

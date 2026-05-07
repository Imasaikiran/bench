"use client";

import { useState } from "react";

const CMD = "npx @imasaikiran/bench";

export function CopyInstall(): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — leave the visible text so user can select-copy
    }
  }

  return (
    <div className="install" data-copy-install onClick={copy} style={{ cursor: "pointer" }} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") copy(); }}
      aria-label="Copy install command to clipboard">
      <span className="install-prompt">$</span>
      <span className="install-cmd">{CMD}</span>
      <span style={{
        fontSize: 11, marginLeft: 12, color: copied ? "#84E1A0" : "#6B6660",
        fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        {copied ? "copied" : "click to copy"}
      </span>
    </div>
  );
}

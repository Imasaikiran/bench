import { defineConfig } from "vitest/config";

export default defineConfig({
  css: false,
  esbuild: {
    // Use the automatic JSX runtime so TSX tests don't need `import React`
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "node",
  },
});

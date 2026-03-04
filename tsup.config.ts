import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Mark native and problematic modules as external
  external: [
    "better-sqlite3",
    "sqlite-vec",
    "@xenova/transformers",
    "sharp",
    "onnxruntime-node",
    "react-devtools-core",
    "yoga-wasm-web",
  ],
  noExternal: ["ink", "@inkjs/ui", "react"],
});

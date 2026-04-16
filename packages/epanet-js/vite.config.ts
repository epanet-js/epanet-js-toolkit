import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

const ENGINE_VERSIONS = [
  "v2.2", "v2.2-msx",
  "v2.3", "v2.3-msx",
  "v2.3.1", "v2.3.1-msx",
  "v2.3.2", "v2.3.2-msx",
  "v2.3.3", "v2.3.3-msx",
  "v2.3.4", "v2.3.4-msx",
  "v2.3.5", "v2.3.5-msx",
  "master", "master-msx",
  "dev", "dev-msx",
];

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "slim/index": resolve(__dirname, "src/slim/index.ts"),
        "engines/v2.2/index": resolve(__dirname, "src/engines/v2.2/index.ts"),
        "engines/v2.2-msx/index": resolve(__dirname, "src/engines/v2.2-msx/index.ts"),
        "engines/v2.3/index": resolve(__dirname, "src/engines/v2.3/index.ts"),
        "engines/v2.3-msx/index": resolve(__dirname, "src/engines/v2.3-msx/index.ts"),
        "engines/v2.3.1/index": resolve(__dirname, "src/engines/v2.3.1/index.ts"),
        "engines/v2.3.1-msx/index": resolve(__dirname, "src/engines/v2.3.1-msx/index.ts"),
        "engines/v2.3.2/index": resolve(__dirname, "src/engines/v2.3.2/index.ts"),
        "engines/v2.3.2-msx/index": resolve(__dirname, "src/engines/v2.3.2-msx/index.ts"),
        "engines/v2.3.3/index": resolve(__dirname, "src/engines/v2.3.3/index.ts"),
        "engines/v2.3.3-msx/index": resolve(__dirname, "src/engines/v2.3.3-msx/index.ts"),
        "engines/v2.3.4/index": resolve(__dirname, "src/engines/v2.3.4/index.ts"),
        "engines/v2.3.4-msx/index": resolve(__dirname, "src/engines/v2.3.4-msx/index.ts"),
        "engines/v2.3.5/index": resolve(__dirname, "src/engines/v2.3.5/index.ts"),
        "engines/v2.3.5-msx/index": resolve(__dirname, "src/engines/v2.3.5-msx/index.ts"),
        "engines/master/index": resolve(__dirname, "src/engines/master/index.ts"),
        "engines/master-msx/index": resolve(__dirname, "src/engines/master-msx/index.ts"),
        "engines/dev/index": resolve(__dirname, "src/engines/dev/index.ts"),
        "engines/dev-msx/index": resolve(__dirname, "src/engines/dev-msx/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {},
  },
  plugins: [
    dts(),
    {
      name: "copy-wasm",
      writeBundle(options) {
        const outDir = options.dir!;
        for (const version of ENGINE_VERSIONS) {
          const src = resolve(
            __dirname,
            `node_modules/@epanet-js/epanet-engine/dist/${version}/EpanetEngine.wasm`
          );
          const destDir = resolve(outDir, `engines/${version}`);
          mkdirSync(destDir, { recursive: true });
          copyFileSync(src, resolve(destDir, "EpanetEngine.wasm"));
        }
      },
    },
  ],
});

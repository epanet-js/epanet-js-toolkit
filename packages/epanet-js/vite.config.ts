import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

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
  plugins: [dts()],
});

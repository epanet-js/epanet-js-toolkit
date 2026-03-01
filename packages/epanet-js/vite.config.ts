import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "EpanetJs",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@model-create/epanet-engine"],
    },
  },
  plugins: [dts()],
});

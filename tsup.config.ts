import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/cli.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
});

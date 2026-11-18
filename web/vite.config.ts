import { defineConfig } from "vitest/config";

export default defineConfig({
  // chemins relatifs : le site peut être servi depuis un sous-dossier (GitHub Pages, etc.)
  base: "./",
  test: {
    environment: "node",
  },
});

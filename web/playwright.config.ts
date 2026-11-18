import { defineConfig } from "@playwright/test";

/**
 * Tests de bout en bout (Playwright + Chromium) : `npm run test:e2e`.
 *
 * Les API (Last.fm, Deezer) sont simulées par `e2e/mocks.ts` : pas de réseau, pas de vraie clé.
 * Le site est construit dans `dist-e2e/` avec une clé factice, pour ne pas écraser `dist/`.
 * Première fois : `npx playwright install chromium`.
 */
const PORT = 4174;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: "en-US",
    trace: "retain-on-failure",
    launchOptions: {
      // E2E_CHROMIUM : Chromium déjà installé ailleurs (conteneur, CI) au lieu de celui de Playwright
      executablePath: process.env.E2E_CHROMIUM || undefined,
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // les variables d'environnement passent avant celles de .env : la vraie clé n'est jamais utilisée
    env: { VITE_LASTFM_API_KEY: "e2e-lastfm-key", VITE_TMDB_API_KEY: "" },
  },
});

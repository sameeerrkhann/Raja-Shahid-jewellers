import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
// Deterministic checks cannot spend provider quota, even when .env.local has a live key.
export default defineConfig({ ...base, outputDir: "artifacts/ai01/test-results", webServer: { command: "pnpm start --port 3100", url: "http://127.0.0.1:3100/design-preview", reuseExistingServer: false, timeout: 120_000, env: { AI_CHAT_ENABLED: "false", GEMINI_API_KEY: " ", GEMINI_FREE_TIER_CONFIRMED: "false", AURIA_TEST_STORE: "true", AURIA_OLLAMA_ENABLED: "false" } } });

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Focused vitest config for the real-backend generated API client tests.
 *
 * The root is anchored to this `frontend/` directory so a repository-root
 * invocation `npx vitest run --config frontend/vitest.api.config.ts` resolves
 * the include globs correctly. Plain node environment: these tests exercise
 * the generated client facade, a bounded real uvicorn call against a freshly
 * seeded SQLite file (frontend/src/api/__tests__/healthClient.test.ts), and
 * static source scans; no DOM is involved.
 *
 * VITE_API_BASE_URL is defaulted because some client assertions fall back to
 * `window.location.origin` when it is unset, and `window` does not exist in
 * the node environment.
 */
export default defineConfig({
  root: dirname,
  test: {
    environment: "node",
    include: ["src/api/**/*.test.ts"],
    env: { VITE_API_BASE_URL: "http://127.0.0.1:8000" },
  },
});

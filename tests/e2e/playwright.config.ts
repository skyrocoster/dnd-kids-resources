import { defineConfig } from "@playwright/test";
import path from "node:path";

// tests/e2e/ -> repository root. Playwright transpiles this config to CJS, so
// __dirname is available; DND's npm script runs Playwright from the frontend
// workspace, so the repo root must come from this file's location rather than
// process.cwd() (chess derives it from its repo-root invocation).
const repoRoot = path.resolve(__dirname, "..", "..");
const frontendDir = path.join(repoRoot, "frontend");

const STORYBOOK_TEST_FILES = new Set(["example-page-storybook.spec.ts"]);

const APP_TEST_FILES = new Set(["app.spec.ts", "health.spec.ts", "weapons.spec.ts"]);

function selectedTestFiles() {
  return process.argv
    .map((argument) => argument.split(/[\\/]/).pop() ?? argument)
    .map((argument) => argument.replace(/:\d+$/, ""))
    .filter((argument) => /(?:spec|test)\.[cm]?[jt]sx?$/.test(argument));
}

function serverProfile() {
  const selected = selectedTestFiles();
  if (selected.length === 0) {
    return "all";
  }
  if (selected.every((file) => STORYBOOK_TEST_FILES.has(file))) {
    return "storybook";
  }
  if (selected.every((file) => APP_TEST_FILES.has(file))) {
    return "app";
  }
  return "all";
}

const appWebServers = [
  {
    command:
      ".venv\\Scripts\\python.exe -m uvicorn backend.app.main:app --host localhost --port 8000",
    // DND has no /api/health endpoint; this is the same readiness URL the
    // compose backend healthcheck uses. When the shared Docker dev backend is
    // already up, it is reused instead of spawning a host uvicorn.
    url: "http://localhost:8000/openapi.json",
    cwd: repoRoot,
    reuseExistingServer: true,
  },
  {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    cwd: frontendDir,
    reuseExistingServer: true,
  },
];

const storybookWebServer = {
  command: "npm run storybook",
  url: "http://localhost:6006",
  cwd: frontendDir,
  reuseExistingServer: true,
  timeout: 30_000,
};

const profile = serverProfile();

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  workers: 2,
  timeout: 15_000,
  use: { baseURL: "http://localhost:5173", headless: true },
  webServer:
    profile === "storybook"
      ? storybookWebServer
      : profile === "app"
        ? appWebServers
        : [...appWebServers, storybookWebServer],
});

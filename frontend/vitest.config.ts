import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test.mjs"],
          // The real-server health check runs through the focused API config
          // (frontend/vitest.api.config.ts), not the fast unit project.
          exclude: ["src/api/__tests__/healthClient.test.ts"],
          css: true,
          // Dynamic feature imports can take several seconds during a cold parallel run.
          testTimeout: 30_000,
          // Cap the unit project at six workers. Vitest 4 requires projects with
          // different maxWorkers to use distinct sequence.groupOrder values, so the
          // unit project gets its own group; the Storybook project is untouched.
          maxWorkers: 6,
          sequence: {
            groupOrder: 1,
          },
          // Suppress Node's ExperimentalWarning for CJS->ESM require() in
          // @asamuzakjp/css-color's dependency chain; it's noise, not actionable.
          execArgv: ["--no-warnings"],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
            // Windows Hyper-V/Docker can reserve the default 63315 port
            // (EACCES on excluded ranges); use a fixed port outside the
            // excluded ranges so Storybook browser tests can start locally.
            api: { port: 47111 },
          },
        },
      },
    ],
  },
});

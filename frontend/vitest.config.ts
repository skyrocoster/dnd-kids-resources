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
          css: true,
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
          },
        },
      },
    ],
  },
});

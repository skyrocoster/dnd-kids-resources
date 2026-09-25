import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { StorybookConfig } from "@storybook/react-vite";

const isStaticBuild = process.argv.includes("build");
const testAddons = ["@storybook/addon-vitest", "@storybook/addon-a11y", "@storybook/addon-mcp"];
const previewRuntimeAsset = "assets/storybook-preview-runtime.js";
const previewRuntimePath = createRequire(import.meta.url).resolve(
  "storybook/internal/preview/runtime",
);
const previewRuntimePlugin = {
  name: "externalize-storybook-preview-runtime",
  enforce: "pre" as const,
  resolveId(source: string) {
    if (source.includes("preview/runtime")) return "\0storybook-preview-runtime";
    if (source === `/${previewRuntimeAsset}` || source === previewRuntimeAsset) {
      return { id: source, external: true };
    }
    return null;
  },
  load(id: string) {
    if (id === "\0storybook-preview-runtime") {
      return `export * from "/${previewRuntimeAsset}";`;
    }
    return null;
  },
  generateBundle(this: {
    emitFile: (file: { type: "asset"; fileName: string; source: Buffer }) => void;
  }) {
    this.emitFile({
      type: "asset",
      fileName: previewRuntimeAsset,
      source: readFileSync(previewRuntimePath),
    });
  },
};

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    ...(isStaticBuild ? [] : testAddons),
    "@storybook/addon-docs",
  ],
  framework: "@storybook/react-vite",
  features: isStaticBuild ? { interactions: false } : undefined,
  viteFinal: (config) => ({
    ...config,
    plugins: isStaticBuild ? [previewRuntimePlugin, ...(config.plugins ?? [])] : config.plugins,
    build: {
      ...config.build,
      rolldownOptions: {
        ...config.build?.rolldownOptions,
        output: {
          ...config.build?.rolldownOptions?.output,
          codeSplitting: {
            groups: [
              ...(config.build?.rolldownOptions?.output?.codeSplitting?.groups ?? []),
              {
                debugName: "storybook-modules",
                name: "storybook-modules",
                test: /node_modules[\\/]storybook[\\/]/,
                minSize: 0,
                maxSize: 200_000,
                includeDependenciesRecursively: false,
                entriesAware: true,
              },
            ],
          },
        },
      },
    },
  }),
};
export default config;

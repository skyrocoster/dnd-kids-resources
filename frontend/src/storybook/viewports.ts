/** Shared viewport presets for consistent responsive Storybook reviews. */
export const storybookViewports = {
  "phone-390": {
    name: "Phone 390",
    styles: { width: "390px", height: "844px" },
  },
  "tablet-768": {
    name: "Tablet 768",
    styles: { width: "768px", height: "1024px" },
  },
  "desktop-1280": {
    name: "Desktop 1280",
    styles: { width: "1280px", height: "900px" },
  },
} as const;

export type StoryViewportName = keyof typeof storybookViewports;

/** Add a checked default viewport to a story's parameters. */
export function storyViewport(name: StoryViewportName) {
  return {
    viewport: {
      defaultViewport: name,
      options: storybookViewports,
    },
  };
}

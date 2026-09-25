import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import "../src/storybook/apiMocks";
import { storybookViewports } from "../src/storybook/viewports";

// The application is dark-only and its theme tokens are scoped to this root
// attribute. Storybook has its own preview document, so set the same theme.
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = "dark";
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: "error",
    },
    viewport: {
      options: storybookViewports,
    },
    options: {
      storySort: {
        order: [
          "Production",
          ["Application", "Design System"],
          "In Development",
          ["Application", "Design System"],
          "Reference",
          ["Catalogues", "Storybook Fixtures"],
        ],
      },
    },
  },
};

export default preview;

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ItemBrowserPage } from "./ItemBrowserPage";
import { ItemEditor } from "./ItemEditor";

const meta = {
  title: "Production/Application/Reference Library/Items",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ItemLibraryEmpty: Story = {
  name: "Item browser — empty library state",
  render: () => <ItemBrowserPage />,
};

export const ItemEditorCreate: Story = {
  name: "Item editor — create item",
  render: () => <ItemEditor onClose={fn()} onSaved={fn()} />,
};

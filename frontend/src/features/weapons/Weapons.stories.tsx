import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { WeaponBrowserPage } from "./WeaponBrowserPage";
import { WeaponEditor } from "./WeaponEditor";

const meta = {
  title: "Production/Application/Reference Library/Weapons",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WeaponLibraryEmpty: Story = {
  name: "Weapon browser — empty library state",
  render: () => <WeaponBrowserPage />,
};

export const WeaponEditorCreate: Story = {
  name: "Weapon editor — create weapon",
  render: () => <WeaponEditor onClose={fn()} onSaved={fn()} />,
};

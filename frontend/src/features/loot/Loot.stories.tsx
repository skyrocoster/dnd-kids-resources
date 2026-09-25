import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AddItemPanel } from "./AddItemPanel";
import { AddWeaponPanel } from "./AddWeaponPanel";
import { LootBundleBrowserPage } from "./LootBundleBrowserPage";
import { LootBundleEditor } from "./LootBundleEditor";

const meta = {
  title: "Production/Application/Reference Library/Loot",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const LootBundleBrowserEmpty: Story = {
  name: "Loot bundles — empty collection",
  render: () => <LootBundleBrowserPage />,
};

export const LootBundleEditorCreate: Story = {
  name: "Loot bundle editor — create bundle",
  render: () => <LootBundleEditor onClose={fn()} onSaved={fn()} />,
};

export const AddItemCatalog: Story = {
  name: "Add item panel — catalog search",
  render: () => <AddItemPanel onAdd={fn()} onClose={fn()} />,
};

export const AddWeaponCatalog: Story = {
  name: "Add weapon panel — catalog search",
  render: () => <AddWeaponPanel onAdd={fn()} onClose={fn()} />,
};

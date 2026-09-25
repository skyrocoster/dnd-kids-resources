import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SpellBrowserPage } from "./SpellBrowserPage";
import { SpellEditor } from "./SpellEditor";
import { DiceRollField } from "./DiceRollField";

const meta = {
  title: "Production/Application/Reference Library/Spells",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpellLibraryEmpty: Story = {
  name: "Spell browser — empty library state",
  render: () => <SpellBrowserPage />,
};

export const SpellEditorCreate: Story = {
  name: "Spell editor — create spell",
  render: () => <SpellEditor onClose={fn()} onSaved={fn()} />,
};

export const DiceRollFieldFilled: Story = {
  name: "Dice roll field — 2d6 plus modifier",
  render: () => <DiceRollField label="Damage" value="2d6+3" onChange={fn()} />,
};

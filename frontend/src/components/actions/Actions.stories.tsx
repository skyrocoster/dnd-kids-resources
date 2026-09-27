import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

const meta = {
  title: "Production/Design System/Actions",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonVariants: Story = {
  name: "Button — variants and sizes",
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="compact">Compact</Button>
      <Button loading>Saving</Button>
    </div>
  ),
};

export const IconButtonLabeled: Story = {
  name: "Icon button — accessible label",
  render: () => (
    <IconButton label="Open options" onClick={fn()}>
      <span aria-hidden="true">⋯</span>
    </IconButton>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatePanel } from "./StatePanel";

const meta = {
  title: "Production/Design System/State",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatePanelExamples: Story = {
  name: "State panel — empty, loading, and error",
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 440 }}>
      <StatePanel status="empty" action={<button type="button">Create a spell</button>} />
      <StatePanel status="loading" />
      <StatePanel status="error" message="The library could not be loaded." />
    </div>
  ),
};

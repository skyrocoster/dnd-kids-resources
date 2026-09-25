import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentDemoPage } from "./ComponentDemoPage";
import { StubPage } from "./StubPage";

const meta = {
  title: "Reference/Storybook Fixtures/Unshipped Pages",
  tags: ["status-reference"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComponentDemo: Story = {
  name: "Component demo — development-only route",
  render: () => <ComponentDemoPage />,
};

export const StubPageExample: Story = {
  name: "Stub page — placeholder content",
  render: () => <StubPage title="Campaign notes" />,
};

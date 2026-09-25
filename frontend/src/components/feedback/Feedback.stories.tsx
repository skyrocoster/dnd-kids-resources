import type { Meta, StoryObj } from "@storybook/react-vite";
import { FeedbackCore } from "./FeedbackCore";
import { InlineFeedback } from "./InlineFeedback";
import { PageFeedback } from "./PageFeedback";
import { PanelFeedback } from "./PanelFeedback";

const meta = {
  title: "Production/Design System/Feedback",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FeedbackCoreInformation: Story = {
  name: "Feedback core — information",
  render: () => <FeedbackCore severity="information" role="status" aria-live="polite" message="Changes are saved automatically." />,
};

export const InlineValidation: Story = {
  name: "Inline feedback — validation error",
  render: () => <InlineFeedback severity="error" message="Enter a name before saving." role="alert" />,
};

export const PageSuccess: Story = {
  name: "Page feedback — success",
  render: () => <PageFeedback severity="success" heading="Spell created" message="Magic Missile is ready for the table." role="status" />,
};

export const PanelWarning: Story = {
  name: "Panel feedback — warning",
  render: () => <PanelFeedback severity="warning" heading="No map assigned" message="Choose a dungeon to share a player map." role="status" />,
};

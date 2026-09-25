import type { Meta, StoryObj } from "@storybook/react-vite";
import { markerBadges } from "./markerBadges";
import { BadgeRing } from "./BadgeRing";

const meta = {
  title: "Production/Application/Player View/Map Markers",
  tags: ["status-production"],
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultipleStatusBadge: Story = {
  name: "Badge ring — multiple fixture statuses",
  render: () => {
    const badges = markerBadges({
      door_id: 3,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: true,
      trapped: true,
    });
    return (
      <figure style={{ margin: 0, display: "grid", gap: 12, justifyItems: "center" }}>
        <svg viewBox="0 0 64 64" width="160" height="160" role="img" aria-label="Door status marker">
          <rect x="1" y="1" width="62" height="62" fill="var(--md-surface-2)" stroke="var(--md-outline)" />
          <circle cx="32" cy="32" r="18" fill="var(--kid-opening)" />
          <BadgeRing badges={badges} cx={32} cy={32} cellX={0} cellY={0} cellSize={64} markerRadius={18} badgeRadius={12} />
        </svg>
        <figcaption>One map badge summarizes the locked and trapped door.</figcaption>
      </figure>
    );
  },
};

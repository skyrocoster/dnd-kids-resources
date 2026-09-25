import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { DungeonBrowserPage } from "./DungeonBrowserPage";

const meta = {
  title: "Production/Application/Dungeons",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DungeonBrowserEmpty: Story = {
  name: "Dungeon browser — empty collection",
  render: () => <MemoryRouter><DungeonBrowserPage /></MemoryRouter>,
};

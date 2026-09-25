import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContextMenu } from "./ContextMenu";
import { Menu } from "./Menu";
import { Menubar } from "./Menubar";

const meta = {
  title: "Production/Design System/Menus",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = [
  { id: "edit", label: "Edit details", textValue: "Edit details", shortcut: "E" },
  { id: "duplicate", label: "Duplicate", textValue: "Duplicate" },
  { id: "divide", separator: true as const },
  { id: "delete", label: "Delete", textValue: "Delete", disabled: true },
];

export const ActionMenu: Story = {
  name: "Menu — actions and separator",
  render: () => <Menu trigger="More actions" items={actions} />,
};

export const ContextMenuArea: Story = {
  name: "Context menu — right-click a room",
  render: () => (
    <ContextMenu
      aria-label="Room actions"
      items={[
        { id: "inspect", label: "Inspect room", textValue: "Inspect room" },
        { id: "add", label: "Add doorway", textValue: "Add doorway" },
      ]}
    >
      <div style={{ padding: 32, border: "1px solid var(--md-outline-variant)" }}>
        Library room — right-click for options
      </div>
    </ContextMenu>
  ),
};

export const ApplicationMenubar: Story = {
  name: "Menubar — map editing commands",
  render: () => (
    <Menubar
      aria-label="Map editing commands"
      menus={[
        { id: "map", label: "Map", items: [{ id: "save", label: "Save layout", textValue: "Save layout" }] },
        { id: "room", label: "Room", items: [{ id: "new-room", label: "New room", textValue: "New room" }] },
      ]}
    />
  ),
};

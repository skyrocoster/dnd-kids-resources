import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavigationMenu } from "./NavigationMenu";
import { PageHeader } from "./PageHeader";
import { Tabs } from "./Tabs";

const meta = {
  title: "Production/Design System/Navigation",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const NavigationMenuGrouped: Story = {
  name: "Navigation menu — grouped links",
  render: () => (
    <NavigationMenu
      items={[
        {
          id: "library",
          label: "Library",
          links: [
            {
              id: "spells",
              label: "Spells",
              href: "#spells",
              description: "Browse spell references",
            },
            { id: "items", label: "Items", href: "#items", description: "Manage adventuring gear" },
          ],
        },
        { id: "home", label: "Home", href: "#home" },
      ]}
    />
  ),
};

export const PageHeaderWithActions: Story = {
  name: "Page header — title, tabs, and actions",
  render: () => (
    <PageHeader
      title="Spellbook"
      subtitle="Choose a spell to review its table-ready details."
      actions={<button type="button">Create spell</button>}
      chapterTabs={[
        {
          key: "known",
          label: "Known",
          icon: <span aria-hidden="true">✦</span>,
          content: <p>Known spells</p>,
        },
        {
          key: "all",
          label: "All spells",
          icon: <span aria-hidden="true">⌕</span>,
          content: <p>All spells</p>,
        },
      ]}
      activeTab="known"
    />
  ),
};

export const TabsWithSections: Story = {
  name: "Tabs — content sections",
  render: () => (
    <Tabs
      ariaLabel="Spell details sections"
      defaultSelectedId="overview"
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: <p>Range: 120 feet · Casting time: one action.</p>,
        },
        { id: "components", label: "Components", content: <p>Verbal and somatic.</p> },
        { id: "notes", label: "Notes", content: <p>Keep this spell ready for the next turn.</p> },
      ]}
    />
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyViewport } from "../../storybook/viewports";
import { BrowserLayout } from "./BrowserLayout";
import { FloatingWindow } from "./FloatingWindow";
import { SearchList } from "./SearchList";
import { SplitPane } from "./SplitPane";

const meta = {
  title: "Production/Design System/Layout",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BrowserLayoutDefault: Story = {
  name: "Browser layout — list and detail",
  parameters: storyViewport("desktop-1280"),
  render: () => (
    <div style={{ minHeight: 420 }}>
      <BrowserLayout
        title="Spells"
        list={
          <SearchList
            items={[{ id: 1, name: "Fire Bolt" }]}
            getId={(item) => item.id}
            getLabel={(item) => item.name}
            onSelect={fn()}
          />
        }
        detail={<p>Select a spell to see its details.</p>}
      />
    </div>
  ),
};

export const BrowserLayoutPhone: Story = {
  name: "Browser layout — phone width",
  parameters: storyViewport("phone-390"),
  render: () => (
    <div style={{ minHeight: 420 }}>
      <BrowserLayout
        title="Spells"
        list={
          <SearchList
            items={[{ id: 1, name: "Fire Bolt" }]}
            getId={(item) => item.id}
            getLabel={(item) => item.name}
            onSelect={fn()}
          />
        }
        detail={<p>Select a spell to see its details.</p>}
      />
    </div>
  ),
};

export const FloatingWindowDocked: Story = {
  name: "Floating window — docked panel",
  render: () => (
    <FloatingWindow
      title="Encounter tracker"
      storageKey="storybook-encounter-window"
      onClose={fn()}
    >
      <p>Round 2 · 3 creatures remain.</p>
    </FloatingWindow>
  ),
};

export const SearchListWithSelection: Story = {
  name: "Search list — selected item",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SearchList
        items={[
          { id: 1, name: "Fire Bolt", meta: "Evocation · cantrip" },
          { id: 2, name: "Mage Hand", meta: "Conjuration · cantrip" },
        ]}
        getId={(item) => item.id}
        getLabel={(item) => item.name}
        getMeta={(item) => item.meta}
        selectedId={1}
        onSelect={fn()}
        variant="spell"
      />
    </div>
  ),
};

export const SplitPaneResizable: Story = {
  name: "Split pane — resizable library layout",
  render: () => (
    <div style={{ height: 360 }}>
      <SplitPane
        leftLabel="spell list"
        defaultLeftWidth={300}
        left={
          <ul>
            <li>Fire Bolt</li>
            <li>Mage Hand</li>
          </ul>
        }
        right={<p>Select a spell to see its details.</p>}
      />
    </div>
  ),
};

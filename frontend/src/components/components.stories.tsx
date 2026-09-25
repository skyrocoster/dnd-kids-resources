import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyViewport } from "../storybook/viewports";
import { Avatar } from "./Avatar";
import { Accordion } from "./Accordion";
import { BrowserLayout } from "./BrowserLayout";
import { Button } from "./Button";
import { CalendarDate } from "./CalendarDate";
import { Card } from "./Card";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog, DialogClose } from "./Dialog";
import { DiceText } from "./DiceText";
import { Disclosure } from "./Disclosure";
import { FloatingWindow } from "./FloatingWindow";
import { GlossaryTerm } from "./GlossaryTerm";
import { IconButton } from "./IconButton";
import { NavigationMenu } from "./NavigationMenu";
import { PageHeader } from "./PageHeader";
import { Popover } from "./Popover";
import { PopoverRoot } from "./PopoverRoot";
import { PreviewCard } from "./PreviewCard";
import { ProgressMeter } from "./ProgressMeter";
import { ScrollArea } from "./ScrollArea";
import { SearchList } from "./SearchList";
import { Separator } from "./Separator";
import { SplitPane } from "./SplitPane";
import { StatePanel } from "./StatePanel";
import { Tabs } from "./Tabs";
import { ToastProvider } from "./Toast";
import { useToast } from "./toastManager";
import { Tooltip, TooltipProvider } from "./Tooltip";

const meta = {
  title: "Production/Design System/Components",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AccordionExpanded: Story = {
  name: "Accordion — expanded",
  render: () => (
    <Accordion
      defaultValue={["spell"]}
      items={[
        {
          value: "spell",
          summary: "Spell details",
          content: <p>Range, components, and duration for this spell.</p>,
        },
        { value: "notes", summary: "Casting notes", content: <p>Keep the description handy.</p> },
      ]}
    />
  ),
};

export const AvatarFallback: Story = {
  name: "Avatar — fallback",
  render: () => <Avatar alt="Mira" fallback="M" size="md" />,
};

export const BrowserLayoutDefault: Story = {
  name: "Browser layout — list and detail",
  parameters: storyViewport("desktop-1280"),
  render: () => (
    <div style={{ minHeight: 420 }}>
      <BrowserLayout
        title="Spells"
        list={<SearchList items={[{ id: 1, name: "Fire Bolt" }]} getId={(item) => item.id} getLabel={(item) => item.name} onSelect={fn()} />}
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
        list={<SearchList items={[{ id: 1, name: "Fire Bolt" }]} getId={(item) => item.id} getLabel={(item) => item.name} onSelect={fn()} />}
        detail={<p>Select a spell to see its details.</p>}
      />
    </div>
  ),
};

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

export const CalendarDateUnset: Story = {
  name: "Calendar date — unset",
  render: () => <CalendarDate label="Session date" value={null} onChange={fn()} />,
};

export const CardVariants: Story = {
  name: "Card — content variants",
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <Card title="Fire Bolt" subtitle="Evocation cantrip" variant="spell" tag="Cantrip">
        <p>Make a ranged spell attack against one creature.</p>
      </Card>
      <Card title="Potion of healing" variant="loot" footer={<Button size="compact">Add to pack</Button>}>
        <p>Restore hit points after a short rest.</p>
      </Card>
    </div>
  ),
};

export const ConfirmDialogOpen: Story = {
  name: "Confirm dialog — destructive action",
  render: () => (
    <ConfirmDialog
      message="Delete the ancient red dragon?"
      confirmLabel="Delete dragon"
      onConfirm={fn()}
      onCancel={fn()}
    />
  ),
};

export const DialogCompound: Story = {
  name: "Dialog — compound API",
  render: () => (
    <Dialog
      defaultOpen
      title="Spell components"
      description="Review the details before continuing."
      footer={<Button>Save changes</Button>}
    >
      <p>Verbal and somatic components are required.</p>
      <DialogClose>Close from spell details</DialogClose>
    </Dialog>
  ),
};

export const DiceTextNotation: Story = {
  name: "Dice text — rules and notation",
  render: () => <p><DiceText text="Roll 2d6 + 3 damage on a successful attack." role="spell" /></p>,
};

export const DisclosureClosed: Story = {
  name: "Disclosure — closed",
  render: () => <Disclosure summary="Show quick rules"><p>Advantage rolls two d20s.</p></Disclosure>,
};

export const FloatingWindowDocked: Story = {
  name: "Floating window — docked panel",
  render: () => (
    <FloatingWindow title="Encounter tracker" storageKey="storybook-encounter-window" onClose={fn()}>
      <p>Round 2 · 3 creatures remain.</p>
    </FloatingWindow>
  ),
};

export const GlossaryTermHint: Story = {
  name: "Glossary term — definition hint",
  render: () => <p>A <GlossaryTerm content="A creature's ability to avoid harm.">saving throw</GlossaryTerm> can change the outcome.</p>,
};

export const IconButtonLabeled: Story = {
  name: "Icon button — accessible label",
  render: () => <IconButton label="Open options" onClick={fn()}><span aria-hidden="true">⋯</span></IconButton>,
};

export const NavigationMenuGrouped: Story = {
  name: "Navigation menu — grouped links",
  render: () => (
    <NavigationMenu
      items={[
        {
          id: "library",
          label: "Library",
          links: [
            { id: "spells", label: "Spells", href: "#spells", description: "Browse spell references" },
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
      actions={<Button>Create spell</Button>}
      chapterTabs={[
        { key: "known", label: "Known", icon: <span aria-hidden="true">✦</span>, content: <p>Known spells</p> },
        { key: "all", label: "All spells", icon: <span aria-hidden="true">⌕</span>, content: <p>All spells</p> },
      ]}
      activeTab="known"
    />
  ),
};

export const PopoverParts: Story = {
  name: "Popover — shared compound parts",
  render: () => (
    <PopoverRoot defaultOpen>
      <Popover.Trigger>Open spell notes</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <Popover.Title>Spell notes</Popover.Title>
            <Popover.Description>Components and duration are ready to review.</Popover.Description>
            <Popover.Close>Close</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </PopoverRoot>
  ),
};

export const PreviewCardOpen: Story = {
  name: "Preview card — open reference preview",
  render: () => (
    <PreviewCard href="#fire-bolt" defaultOpen trigger="Fire Bolt">
      <h2>Fire Bolt</h2>
      <p>Evocation cantrip · 120 feet</p>
    </PreviewCard>
  ),
};

export const ProgressMeterStates: Story = {
  name: "Progress meter — determinate and unavailable",
  render: () => (
    <div style={{ display: "grid", gap: 20, maxWidth: 420 }}>
      <ProgressMeter value={6} max={10} label="Spell slots used" valueText="6 of 10 slots" />
      <ProgressMeter value={null} label="Campaign completion" />
    </div>
  ),
};

export const ScrollAreaContent: Story = {
  name: "Scroll area — long content",
  render: () => (
    <ScrollArea style={{ blockSize: 220, maxWidth: 360, border: "1px solid var(--md-outline-variant)" }}>
      <ol>{Array.from({ length: 12 }, (_, index) => <li key={index}>Encounter note {index + 1}</li>)}</ol>
    </ScrollArea>
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

export const SeparatorOrientations: Story = {
  name: "Separator — horizontal and vertical",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, minHeight: 80 }}>
      <span>Spells</span><Separator orientation="vertical" style={{ height: 40 }} /><span>Items</span>
      <Separator /><span>Encounters</span>
    </div>
  ),
};

export const SplitPaneResizable: Story = {
  name: "Split pane — resizable library layout",
  render: () => (
    <div style={{ height: 360 }}>
      <SplitPane leftLabel="spell list" defaultLeftWidth={300} left={<ul><li>Fire Bolt</li><li>Mage Hand</li></ul>} right={<p>Select a spell to see its details.</p>} />
    </div>
  ),
};

export const StatePanelExamples: Story = {
  name: "State panel — empty, loading, and error",
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 440 }}>
      <StatePanel status="empty" action={<Button>Create a spell</Button>} />
      <StatePanel status="loading" />
      <StatePanel status="error" message="The library could not be loaded." />
    </div>
  ),
};

export const TabsWithSections: Story = {
  name: "Tabs — content sections",
  render: () => (
    <Tabs
      ariaLabel="Spell details sections"
      defaultSelectedId="overview"
      tabs={[
        { id: "overview", label: "Overview", content: <p>Range: 120 feet · Casting time: one action.</p> },
        { id: "components", label: "Components", content: <p>Verbal and somatic.</p> },
        { id: "notes", label: "Notes", content: <p>Keep this spell ready for the next turn.</p> },
      ]}
    />
  ),
};

function ToastTrigger() {
  const toast = useToast();
  return <Button onClick={() => toast.add({ title: "Saved", description: "Your notes are ready." })}>Show saved notice</Button>;
}

export const ToastNotification: Story = {
  name: "Toast — saved notice",
  render: () => <ToastProvider timeout={0}><ToastTrigger /></ToastProvider>,
};

export const TooltipHint: Story = {
  name: "Tooltip — keyboard-accessible hint",
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen trigger="?" content="A short rule reminder." />
    </TooltipProvider>
  ),
};

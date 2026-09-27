import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Accordion } from "./Accordion";
import { Avatar } from "./Avatar";
import { CalendarDate } from "./CalendarDate";
import { Card } from "./Card";
import { DiceText } from "./DiceText";
import { Disclosure } from "./Disclosure";
import { GlossaryTerm } from "./GlossaryTerm";
import { ProgressMeter } from "./ProgressMeter";
import { ScrollArea } from "./ScrollArea";
import { Separator } from "./Separator";

const meta = {
  title: "Production/Design System/Content",
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
      <Card title="Potion of healing" variant="loot" footer={<span>Add to pack</span>}>
        <p>Restore hit points after a short rest.</p>
      </Card>
    </div>
  ),
};

export const DiceTextNotation: Story = {
  name: "Dice text — rules and notation",
  render: () => (
    <p>
      <DiceText text="Roll 2d6 + 3 damage on a successful attack." role="spell" />
    </p>
  ),
};

export const DisclosureClosed: Story = {
  name: "Disclosure — closed",
  render: () => (
    <Disclosure summary="Show quick rules">
      <p>Advantage rolls two d20s.</p>
    </Disclosure>
  ),
};

export const GlossaryTermHint: Story = {
  name: "Glossary term — definition hint",
  render: () => (
    <p>
      A <GlossaryTerm content="A creature's ability to avoid harm.">saving throw</GlossaryTerm> can
      change the outcome.
    </p>
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
    <ScrollArea
      style={{ blockSize: 220, maxWidth: 360, border: "1px solid var(--md-outline-variant)" }}
    >
      <ol>
        {Array.from({ length: 12 }, (_, index) => (
          <li key={index}>Encounter note {index + 1}</li>
        ))}
      </ol>
    </ScrollArea>
  ),
};

export const SeparatorOrientations: Story = {
  name: "Separator — horizontal and vertical",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, minHeight: 80 }}>
      <span>Spells</span>
      <Separator orientation="vertical" style={{ height: 40 }} />
      <span>Items</span>
      <Separator />
      <span>Encounters</span>
    </div>
  ),
};

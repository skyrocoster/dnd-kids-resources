import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { NPC } from "../../api/types";
import { AddToEncounterDialog } from "./AddToEncounterDialog";
import { NPCBrowserPage } from "./NPCBrowserPage";
import { NPCEditor } from "./NPCEditor";
import { NPCStatCard } from "./NPCStatCard";
import { NpcChip } from "./NpcChip";
import { PullFromMonsterDialog } from "./PullFromMonsterDialog";

const meta = {
  title: "Production/Application/Party/NPCs",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const npc: NPC = {
  id: 7,
  name: "Emery Hart",
  race: "Human",
  gender: "Female",
  background: "Village Guide",
  appearance: { hair_colour: "black", eye_colour: "brown" },
  notes: "Knows the forest paths and watches for danger.",
  ac: { value: 15, note: "leather armor", alternatives: [] },
  hp: { average: 22, formula: "4d8 + 4" },
  speed: [{ mode: "walk", feet: 30, hover: false }],
  abilities: { str: 12, dex: 14, con: 12, int: 11, wis: 15, cha: 13 },
  skills: { survival: 5, perception: 4 },
  languages: ["Common", "Elvish"],
};

export const NPCBrowserEmpty: Story = {
  name: "NPC browser — empty roster",
  render: () => <NPCBrowserPage />,
};

export const NPCStatCardDetails: Story = {
  name: "NPC stat card — identity and field notes",
  render: () => <div style={{ maxWidth: 620 }}><NPCStatCard npc={npc} /></div>,
};

export const NPCEditorCreate: Story = {
  name: "NPC editor — create character",
  render: () => <NPCEditor onClose={fn()} onSaved={fn()} />,
};

export const NPCChipNamed: Story = {
  name: "NPC chip — resolved roster name",
  render: () => <NpcChip npcId={7} roster={new Map([[7, npc.name]])} onClick={fn()} />,
};

export const AddNPCToEncounter: Story = {
  name: "Add NPC dialog — empty encounter list",
  render: () => <AddToEncounterDialog npc={npc} onClose={fn()} onAdded={fn()} />,
};

export const PullNPCFields: Story = {
  name: "Pull from monster dialog — choose a source",
  render: () => <PullFromMonsterDialog npc={npc} onClose={fn()} onPulled={fn()} />,
};

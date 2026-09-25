import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MemoryRouter } from "react-router-dom";
import type { Monster } from "../../api/types";
import { MonsterBrowserPage } from "./MonsterBrowserPage";
import { MonsterEditor } from "./MonsterEditor";
import { MonsterStatBlock } from "./MonsterStatBlock";

const meta = {
  title: "Production/Application/Reference Library/Monsters",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const dragon: Monster = {
  id: 18,
  name: "Young Red Dragon",
  aliases: [],
  sizes: ["large"],
  alignment: "chaotic evil",
  creature_type: { category: "dragon", tags: [], swarm_size: null },
  ac: { value: 18, note: "natural armor", alternatives: [] },
  hp: { average: 178, formula: "17d10 + 85" },
  speed: [{ mode: "walk", feet: 40, hover: false }, { mode: "fly", feet: 80, hover: false }],
  abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
  saving_throws: { dex: 5, con: 9, wis: 4, cha: 8 },
  skills: { perception: 8, stealth: 4 },
  passive_perception: 18,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [{ type: "darkvision", range: 120, note: null }],
  languages: ["Common", "Draconic"],
  audio_path: null,
  features: {
    traits: [{ name: "Fire Breath", description: "The dragon exhales fire in a cone.", attack: null }],
    spellcasting: [],
    actions: [{ name: "Bite", description: "Melee Weapon Attack.", attack: null }],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  cr: "10",
  cr_sort: 10,
};

export const MonsterLibraryEmpty: Story = {
  name: "Monster browser — empty library state",
  render: () => <MemoryRouter><MonsterBrowserPage /></MemoryRouter>,
};

export const MonsterStatBlockFull: Story = {
  name: "Monster stat block — complete reference",
  render: () => <div style={{ maxWidth: 620 }}><MonsterStatBlock monster={dragon} /></div>,
};

export const MonsterEditorCreate: Story = {
  name: "Monster editor — create creature",
  render: () => <MemoryRouter><MonsterEditor /></MemoryRouter>,
};

export const MonsterEditorInvalidRoute: Story = {
  name: "Monster editor — invalid route ID",
  render: () => <MemoryRouter initialEntries={["/monsters/not-a-number/edit"]}><MonsterEditor /></MemoryRouter>,
};

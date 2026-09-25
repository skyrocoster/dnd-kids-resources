import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Player, Spell, Weapon } from "../../api/types";
import { ManageAssignmentsDialog } from "./PlayerAssignments";
import { PlayerBrowserPage } from "./PlayerBrowserPage";
import { PlayerCombatSummary } from "./PlayerCombatSummary";
import { PlayerEditor } from "./PlayerEditor";
import { PlayerSpellSection } from "./PlayerSpellSection";
import { PlayerWeaponSection } from "./PlayerWeaponSection";

const meta = {
  title: "Production/Application/Party/Players",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const player: Player = {
  id: 1,
  name: "Mira Starweaver",
  child_name: "Avery",
  class: "Wizard",
  ancestry: "Elf",
  level: 4,
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 26, formula: "4d6 + 12" },
  speed: [{ mode: "walk", feet: 30, hover: false }],
  initiative: 2,
  abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 10 },
  spell_attack_bonus: 6,
  spell_save_dc: 14,
};

const spell: Spell = {
  id: 10,
  name: "Magic Missile",
  level: 1,
  description: "Three darts of magical force strike their targets.",
  quick_rules: "Create three darts that each deal 1d4+1 force damage.",
  range: "120 feet",
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  casting_times: ["1 action"],
  components: ["V", "S"],
};

const weapon: Weapon = {
  id: 3,
  name: "Quarterstaff",
  weapon_category: "Simple melee weapon",
  weight: 4,
  property: ["Versatile"],
};

export const PlayerLibraryEmpty: Story = {
  name: "Player browser — empty roster",
  render: () => <PlayerBrowserPage />,
};

export const PlayerEditorCreate: Story = {
  name: "Player editor — create character",
  render: () => <PlayerEditor onClose={fn()} onSaved={fn()} />,
};

export const PlayerCombatSummaryFull: Story = {
  name: "Combat summary — armor, hit points, and profile",
  render: () => <div style={{ maxWidth: 640 }}><PlayerCombatSummary player={player} /></div>,
};

export const PlayerSpellSectionAssigned: Story = {
  name: "Spell assignments — one prepared spell",
  render: () => <PlayerSpellSection player={player} spells={[spell]} />,
};

export const PlayerWeaponSectionAssigned: Story = {
  name: "Weapon assignments — one equipped weapon",
  render: () => <PlayerWeaponSection weapons={[weapon]} />,
};

export const PlayerAssignmentsDialog: Story = {
  name: "Assignment dialog — select spells",
  render: () => (
    <ManageAssignmentsDialog
      title="Manage spells"
      items={[{ id: 10, name: "Magic Missile" }, { id: 11, name: "Shield" }]}
      assignedIds={[10]}
      getId={(item) => item.id}
      getLabel={(item) => item.name}
      onSave={async () => {}}
      onClose={fn()}
      searchPlaceholder="Search spells…"
    />
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Condition } from "../../api/types";
import { AddMonsterPanel } from "./AddMonsterPanel";
import { AddPlayerPanel } from "./AddPlayerPanel";
import { CombatantCard } from "./CombatantCard";
import { ConditionPicker } from "./ConditionPicker";
import { CreatureRowCard } from "./CreatureRowCard";
import { EncounterBrowserPage } from "./EncounterBrowserPage";
import { EncounterDock } from "./EncounterDock";
import { EncounterEditor } from "./EncounterEditor";
import { EncounterRunnerPage } from "./EncounterRunnerPage";

const meta = {
  title: "Production/Application/Encounters",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const conditions: Condition[] = [{ id: 1, name: "Poisoned" }, { id: 2, name: "Prone" }];

export const EncounterBrowserEmpty: Story = {
  name: "Encounter browser — empty collection",
  render: () => <MemoryRouter><EncounterBrowserPage /></MemoryRouter>,
};

export const EncounterEditorCreate: Story = {
  name: "Encounter editor — new encounter",
  render: () => <EncounterEditor onClose={fn()} onSaved={fn()} />,
};

export const CreatureEditorRow: Story = {
  name: "Creature row — editable combat stats",
  render: () => (
    <div style={{ maxWidth: 900 }}>
      <CreatureRowCard
        row={{
          id: "story-goblin",
          monsterId: "",
          originalName: "Goblin Scout",
          name: "Goblin Scout",
          hpCurrent: "7",
          hpMax: "7",
          ac: "15",
          status: "alive",
          conditions: ["Poisoned"],
        }}
        monsters={[]}
        conditions={conditions}
        collapsed={false}
        onToggleCollapsed={fn()}
        onPickMonster={fn()}
        onChange={fn()}
        onRemove={fn()}
      />
    </div>
  ),
};

export const ConditionPickerSelected: Story = {
  name: "Condition picker — selected conditions",
  render: () => <ConditionPicker conditions={conditions} selected={["Poisoned"]} onChange={fn()} />,
};

export const AddPlayerCombatant: Story = {
  name: "Add player panel — enter a name",
  render: () => <AddPlayerPanel conditions={conditions} onAdd={fn()} onClose={fn()} />,
};

export const AddMonsterCombatant: Story = {
  name: "Add monster panel — catalog search",
  render: () => <AddMonsterPanel onAdd={fn()} onClose={fn()} />,
};

export const CombatantActive: Story = {
  name: "Combatant card — active turn",
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <CombatantCard
        combatant={{
          clientId: "story-goblin",
          creature_id: 1,
          source_kind: "monster",
          original_name: "Goblin Scout",
          name: "Goblin Scout",
          hp_current: 4,
          hp_max: 7,
          ac: 15,
          status: "alive",
          conditions: ["Poisoned"],
        }}
        isActive
        index={0}
        count={2}
        conditions={conditions}
        onAdjustHp={fn()}
        onSetHp={fn()}
        onSetStatus={fn()}
        onSetConditions={fn()}
        onRename={fn()}
        onDuplicate={fn()}
        onRemove={fn()}
        onMoveUp={fn()}
        onMoveDown={fn()}
        onSetActive={fn()}
        onDragHandlePointerDown={fn()}
      />
    </div>
  ),
};

export const EncounterRunner: Story = {
  name: "Encounter runner — live round",
  render: () => (
    <MemoryRouter initialEntries={["/encounters/1/run"]}>
      <Routes>
        <Route path="/encounters/:id/run" element={<EncounterRunnerPage />} />
      </Routes>
    </MemoryRouter>
  ),
};

export const EncounterDockedRunner: Story = {
  name: "Encounter dock — compact runner window",
  render: () => <EncounterDock encounterId={1} onClose={fn()} />,
};

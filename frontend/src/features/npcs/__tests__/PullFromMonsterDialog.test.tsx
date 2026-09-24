import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../api/client";
import type { Monster, NPC } from "../../../api/types";
import { PullFromMonsterDialog } from "../PullFromMonsterDialog";

const testMonster: Monster = {
  id: 10,
  name: "Goblin",
  aliases: [],
  sizes: ["small"],
  family: null,
  alignment: "neutral evil",
  creature_type: { category: "humanoid", tags: ["goblinoid"], swarm_size: null },
  ac: { value: 15, note: "leather armor, shield", alternatives: [] },
  hp: { average: 7, formula: "2d6" },
  speed: [{ mode: "walk", feet: 30, note: null, hover: false }],
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  saving_throws: {},
  skills: { stealth: 6 },
  passive_perception: 9,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [{ type: "darkvision", range: 60, note: null }],
  languages: ["Common", "Goblin"],
  audio_path: null,
  features: {
    traits: [
      {
        name: "Nimble Escape",
        description: "Can Disengage or Hide as a bonus action.",
        attack: null,
      },
    ],
    spellcasting: [],
    actions: [
      {
        name: "Scimitar",
        description: "Melee Weapon Attack.",
        attack: {
          kind: "melee_weapon",
          attack_bonus: 4,
          automatic_hit: false,
          range_ft: 5,
          long_range_ft: null,
          targets: 1,
          damage: [{ formula: "1d6+2", bonus: 2, damage_types: ["slashing"] }],
        },
      },
    ],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  cr: "1/4",
  cr_sort: 0.25,
  cr_note: null,
  experience_points: 50,
};

const testNPC: NPC = {
  id: 5,
  name: "Barkeep",
  sizes: ["medium"],
  alignment: null,
  creature_type: null,
  ac: { value: 10, note: null, alternatives: [] },
  hp: { average: 4, formula: "1d8" },
  speed: [],
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 12 },
  saving_throws: {},
  skills: {},
  passive_perception: null,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [],
  languages: ["Common"],
  features: {
    traits: [],
    spellcasting: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  cr: null,
  cr_note: null,
  experience_points: null,
  race: null,
  gender: null,
  background: null,
  appearance: null,
  notes: null,
};

describe("PullFromMonsterDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listMonsters").mockResolvedValue([testMonster]);
  });

  it("commits staged rows from separate regions and calls onPulled", async () => {
    const updateNPC = vi.spyOn(api, "updateNPC").mockResolvedValue(testNPC);
    const onPulled = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<PullFromMonsterDialog npc={testNPC} onClose={onClose} onPulled={onPulled} />);

    await screen.findByText("Goblin");
    await user.click(screen.getByText("Goblin"));

    expect(screen.getByRole("heading", { name: "Stats" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lore" })).toBeInTheDocument();
    expect(screen.getAllByText(/you have/).length).toBeGreaterThan(0);

    const acCheckbox = screen.getByRole("checkbox", { name: /Armor Class/ });
    await user.click(acCheckbox);
    await user.click(screen.getByRole("checkbox", { name: "Nimble Escape" }));

    await user.click(screen.getByRole("button", { name: "Pull 2 selected" }));

    await waitFor(() => expect(updateNPC).toHaveBeenCalledOnce());
    expect(updateNPC).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        name: "Barkeep",
        ac: { value: 15, note: "leather armor, shield", alternatives: [] },
        features: expect.objectContaining({ traits: [testMonster.features.traits[0]] }),
      }),
    );
    expect(onPulled).toHaveBeenCalledWith(testNPC);
    expect(onClose).toHaveBeenCalled();
  });

  it("clears staged rows when a different monster is selected", async () => {
    vi.mocked(api.listMonsters).mockResolvedValue([
      testMonster,
      { ...testMonster, id: 11, name: "Ogre" },
    ]);
    const user = userEvent.setup();

    render(<PullFromMonsterDialog npc={testNPC} onClose={() => {}} onPulled={() => {}} />);

    await screen.findByText("Goblin");
    await user.click(screen.getByText("Goblin"));
    await user.click(screen.getByRole("checkbox", { name: /Armor Class/ }));
    expect(screen.getByRole("button", { name: "Pull 1 selected" })).toBeEnabled();

    await user.click(screen.getByText("Ogre"));

    expect(screen.getByRole("checkbox", { name: /Armor Class/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Pull 0 selected" })).toBeDisabled();
  });

  it("before any monster is chosen, shows the empty message and disables the commit button", async () => {
    render(<PullFromMonsterDialog npc={testNPC} onClose={() => {}} onPulled={() => {}} />);

    await screen.findByText("Goblin");

    expect(screen.getByText("Choose a monster to see what you can pull.")).toBeInTheDocument();

    const pullButton = screen.getByRole("button", { name: "Pull 0 selected" });
    expect(pullButton).toBeDisabled();
  });

  it("keeps monster browsing separate from pullable field selection", async () => {
    const monsters = Array.from({ length: 30 }, (_, index) => ({
      ...testMonster,
      id: index + 1,
      name: index === 20 ? "Target Goblin" : `Monster ${index + 1}`,
    }));
    vi.mocked(api.listMonsters).mockResolvedValue(monsters);
    const user = userEvent.setup();

    render(<PullFromMonsterDialog npc={testNPC} onClose={() => {}} onPulled={() => {}} />);

    await screen.findByText("Target Goblin");
    await user.click(screen.getByText("Target Goblin"));

    const dialog = screen.getByRole("dialog");
    const monsterList = dialog.querySelector(".pull-from-monster-list")!;
    const pullableFields = dialog.querySelector(".pull-from-monster-tree")!;
    const armorClassCheckbox = screen.getByRole("checkbox", { name: /Armor Class/ });
    expect(monsterList).toContainElement(screen.getByText("Target Goblin"));
    expect(monsterList).not.toContainElement(armorClassCheckbox);
    expect(pullableFields).toContainElement(armorClassCheckbox);
    expect(pullableFields).not.toContainElement(screen.getByText("Target Goblin"));
    expect(screen.getByRole("button", { name: "Pull 0 selected" })).toBeDisabled();
  });

  it("api.updateNPC rejecting shows an inline status error and keeps the dialog open", async () => {
    vi.spyOn(api, "updateNPC").mockRejectedValue(new Error("Server unavailable"));
    const onPulled = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<PullFromMonsterDialog npc={testNPC} onClose={onClose} onPulled={onPulled} />);

    await screen.findByText("Goblin");
    await user.click(screen.getByText("Goblin"));

    const acCheckbox = screen.getByRole("checkbox", { name: /Armor Class/ });
    await user.click(acCheckbox);

    await user.click(screen.getByRole("button", { name: "Pull 1 selected" }));

    const statusEl = await screen.findByRole("status");
    expect(statusEl).toHaveTextContent("Server unavailable");

    expect(onPulled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

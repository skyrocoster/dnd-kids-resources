import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Player, Spell } from "../../../api/types";
import { PlayerSpellSection } from "../PlayerSpellSection";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: "Luna Starweaver",
    ...overrides,
  };
}

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 1,
    name: "Fireball",
    level: 3,
    school: "evocation",
    categories: ["Other"],
    description: "A bright streak flashes from your finger",
    alternate_description: null,
    quick_rules: "8d6 fire damage in 20 ft. radius",
    higher_levels: { text: "Increase damage by 1d6 per slot level above 3rd", damage_by_slot: {} },
    range: "150 ft.",
    casting_times: ["1 action"],
    duration: "Instantaneous",
    concentration: false,
    ritual: false,
    components: ["V", "S", "M"],
    materials: null,
    damage: [],
    healing: { amount: null, temp_hp: false, max_hp: false },
    attacks: [],
    area_of_effect: { shape: null, size: null },
    ...overrides,
  };
}

describe("PlayerSpellSection", () => {
  it("renders empty state when no spells are assigned", () => {
    render(<PlayerSpellSection player={makePlayer()} spells={[]} />);
    expect(screen.getByText("No spells assigned.")).toBeInTheDocument();
  });

  it("groups spells by level in ascending order and sorts alphabetically within level", () => {
    const spells = [
      makeSpell({ id: 3, name: "Acid Splash", level: 0 }),
      makeSpell({ id: 4, name: "Fire Bolt", level: 0 }),
      makeSpell({ id: 1, name: "Fireball", level: 3 }),
      makeSpell({ id: 2, name: "Magic Missile", level: 1 }),
      makeSpell({ id: 5, name: "Shield", level: 1 }),
    ];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    const headings = screen.getAllByRole("heading", { level: 4 });
    expect(headings).toHaveLength(3);
    expect(headings[0]).toHaveTextContent("Cantrip");
    expect(headings[1]).toHaveTextContent("1st Level");
    expect(headings[2]).toHaveTextContent("3rd Level");

    const names = screen.getAllByText("Acid Splash", { selector: ".spell-section-name" });
    expect(names).toHaveLength(1);
  });

  it("shows quick rules without expanding", () => {
    const spells = [makeSpell({ quick_rules: "8d6 fire damage" })];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    expect(screen.getByText(/fire damage/)).toBeInTheDocument();
  });

  it("does not render quick rules section when quick_rules is absent", () => {
    const spells = [makeSpell({ quick_rules: null })];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    expect(screen.getByText("Fireball")).toBeInTheDocument();
  });

  it("expands in place to reveal description on toggle click", async () => {
    const user = userEvent.setup();
    const spells = [makeSpell({ description: "A bright streak flashes from your finger" })];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    expect(screen.queryByText("A bright streak flashes from your finger")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { expanded: false });
    await user.click(toggle);

    expect(screen.getByText("A bright streak flashes from your finger")).toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText("A bright streak flashes from your finger")).not.toBeInTheDocument();
  });

  it("keeps multiple spell details open independently with keyboard activation", async () => {
    const user = userEvent.setup();
    const spells = [
      makeSpell({ id: 1, name: "Fireball", description: "Fireball details", level: 3 }),
      makeSpell({ id: 2, name: "Lightning Bolt", description: "Lightning Bolt details", level: 3 }),
    ];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    const fireballToggle = screen.getByRole("button", { name: "Fireball", expanded: false });
    await user.tab();
    expect(fireballToggle).toHaveFocus();
    await user.keyboard(" ");

    const lightningToggle = screen.getByRole("button", { name: "Lightning Bolt", expanded: false });
    await user.tab();
    expect(lightningToggle).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Fireball", expanded: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lightning Bolt", expanded: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fireball details")).toBeInTheDocument();
    expect(screen.getByText("Lightning Bolt details")).toBeInTheDocument();

    await user.tab({ shift: true });
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Fireball", expanded: false })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lightning Bolt", expanded: true }),
    ).toBeInTheDocument();
  });

  it("shows alternate_description and higher_levels when expanded", async () => {
    const user = userEvent.setup();
    const spells = [
      makeSpell({
        description: "A bright streak flashes",
        alternate_description: "You hurl a ball of fire",
        higher_levels: { text: "Increase damage by 1d6", damage_by_slot: {} },
      }),
    ];
    render(<PlayerSpellSection player={makePlayer()} spells={spells} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("A bright streak flashes")).toBeInTheDocument();
    expect(screen.getByText("You hurl a ball of fire")).toBeInTheDocument();
    expect(screen.getByText(/Increase damage by/)).toBeInTheDocument();
  });

  it("resolves spell reference context from player fields", () => {
    const spells = [makeSpell({ quick_rules: "Attack: {spell_attack_bonus}, DC {spell_save_dc}" })];
    const player = makePlayer({ spell_attack_bonus: 7, spell_save_dc: 15 });
    render(<PlayerSpellSection player={player} spells={spells} />);

    expect(screen.getByText(/Attack: 7, DC 15/)).toBeInTheDocument();
  });
});

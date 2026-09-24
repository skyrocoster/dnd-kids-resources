import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Monster } from "../../../api/types";
import { CreatureRowCard } from "../CreatureRowCard";
import { addEncounterCreatureRow } from "../encounterForm";

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: 1,
    name: "Monster",
    aliases: [],
    sizes: [],
    family: null,
    alignment: null,
    creature_type: null,
    ac: null,
    hp: null,
    speed: [],
    abilities: null,
    saving_throws: {},
    skills: {},
    passive_perception: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    condition_immunities: [],
    senses: [],
    languages: [],
    audio_path: null,
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
    cr_sort: null,
    cr_note: null,
    experience_points: null,
    ...overrides,
  };
}

const goblin: Monster = monster({
  id: 1,
  name: "Goblin",
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 7, formula: null },
});

function makeRow() {
  const [row] = addEncounterCreatureRow([]);
  return { ...row, name: "Goblin", hpCurrent: "7", hpMax: "7", ac: "15" };
}

describe("CreatureRowCard", () => {
  it("shows a summary (name, AC, HP, status, condition count) when collapsed", () => {
    const row = { ...makeRow(), conditions: ["Poisoned", "Prone"] };
    render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed
        onToggleCollapsed={() => {}}
        onPickMonster={() => {}}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText("Goblin")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("7 / 7 HP")).toBeInTheDocument();
    expect(screen.getByText("2 conditions")).toBeInTheDocument();
    expect(screen.queryByLabelText("Monster")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false, name: "Goblin" })).not.toContainElement(
      screen.getByRole("button", { name: "Remove Goblin" }),
    );
  });

  it("reveals editable fields when expanded, and the toggle flips aria-expanded", async () => {
    const row = makeRow();
    const onToggleCollapsed = vi.fn();
    const { rerender } = render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
        onPickMonster={() => {}}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    const toggle = screen.getByRole("button", { expanded: false });
    await userEvent.click(toggle);
    expect(onToggleCollapsed).toHaveBeenCalled();

    rerender(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed={false}
        onToggleCollapsed={onToggleCollapsed}
        onPickMonster={() => {}}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByLabelText("Monster")).toBeInTheDocument();
    expect(screen.getByLabelText("HP Current")).toHaveValue(7);
    expect(screen.getByRole("button", { expanded: true, name: "Goblin" })).not.toContainElement(
      screen.getByRole("button", { name: row.status, pressed: true }),
    );
  });

  it("opens the controlled disclosure with the keyboard", async () => {
    const row = makeRow();
    const onToggleCollapsed = vi.fn();
    render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
        onPickMonster={() => {}}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    const toggle = screen.getByRole("button", { expanded: false, name: "Goblin" });
    toggle.focus();
    await userEvent.keyboard("{Enter}");

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Monster")).not.toBeInTheDocument();
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const row = makeRow();
    const onRemove = vi.fn();
    render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed
        onToggleCollapsed={() => {}}
        onPickMonster={() => {}}
        onChange={() => {}}
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /Remove Goblin/ });
    expect(removeButton).toHaveAttribute("type", "button");
    await userEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalled();
  });

  it("status chip clicks call onChange with the new status", async () => {
    const row = makeRow();
    const onChange = vi.fn();
    render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed={false}
        onToggleCollapsed={() => {}}
        onPickMonster={() => {}}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "fled", pressed: false }));
    expect(onChange).toHaveBeenCalledWith({ status: "fled" });
  });

  it("keeps the four status choices exclusive, non-clearable, and styled", async () => {
    const statuses = ["alive", "unconscious", "dead", "fled"] as const;
    const onChange = vi.fn();

    function ControlledStatusRow() {
      const [row, setRow] = useState({ ...makeRow(), status: "alive" });
      return (
        <CreatureRowCard
          row={row}
          monsters={[goblin]}
          conditions={[]}
          collapsed={false}
          onToggleCollapsed={() => {}}
          onPickMonster={() => {}}
          onChange={(fields) => {
            onChange(fields);
            setRow((current) => ({ ...current, ...fields }));
          }}
          onRemove={() => {}}
        />
      );
    }

    render(<ControlledStatusRow />);
    const group = screen.getByRole("group", { name: "Status" });
    const statusButtons = statuses.map((status) =>
      within(group).getByRole("button", { name: status }),
    );

    for (const status of statuses) {
      const button = within(group).getByRole("button", { name: status });
      expect(button).toContainElement(
        button.querySelector(`.creature-row-status-chip.creature-row-status-${status}`),
      );
    }
    expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(1);

    for (const status of statuses.slice(1).concat("alive")) {
      await userEvent.click(within(group).getByRole("button", { name: status }));
      expect(onChange).toHaveBeenLastCalledWith({ status });
      expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(1);
      expect(
        within(group).getByRole("button", { name: status, pressed: true }),
      ).toBeInTheDocument();
    }

    const callsBeforeClearAttempt = onChange.mock.calls.length;
    await userEvent.click(within(group).getByRole("button", { name: "alive", pressed: true }));
    expect(onChange).toHaveBeenCalledTimes(callsBeforeClearAttempt);
    expect(within(group).getByRole("button", { name: "alive", pressed: true })).toBeInTheDocument();
    expect(statusButtons).toHaveLength(4);
  });

  it("activates a status choice with the keyboard", async () => {
    const row = makeRow();
    const onChange = vi.fn();
    render(
      <CreatureRowCard
        row={row}
        monsters={[goblin]}
        conditions={[]}
        collapsed={false}
        onToggleCollapsed={() => {}}
        onPickMonster={() => {}}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );

    const statusButton = screen.getByRole("button", { name: "unconscious" });
    statusButton.focus();
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith({ status: "unconscious" });
  });
});

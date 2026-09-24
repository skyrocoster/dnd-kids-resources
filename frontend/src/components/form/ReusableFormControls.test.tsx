import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Autocomplete } from "./Autocomplete";
import { CheckboxGroup } from "./CheckboxGroup";
import { Combobox } from "./Combobox";
import { Field } from "./Field";
import { RadioGroup } from "./RadioGroup";
import { Select } from "./Select";
import { TextInput } from "./TextInput";
import type { DropdownOptionDefinition } from "./DropdownParts";

const OPTIONS: readonly DropdownOptionDefinition[] = [
  { value: "arcane", label: "Arcane" },
  { value: "nature", label: "Nature" },
  { value: "fire", label: "Fire", disabled: true },
];

function ControlledCombobox({ onValueChange }: { onValueChange: (value: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      ariaLabel="Damage type"
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
}

describe("reusable form-control primitives", () => {
  it("connects field presentation and forwards text-input states", () => {
    render(
      <Field label="Email" description="Used for reminders." invalid error="Enter a valid address.">
        <TextInput aria-label="Email" type="email" invalid defaultValue="learner@" />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue("learner@");
    expect(screen.getByText("Used for reminders.")).toBeVisible();
    expect(screen.getByText("Enter a valid address.")).toBeVisible();
  });

  it("exposes selection, disabled options, and free-form autocomplete values", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function AutocompleteHarness() {
      const [value, setValue] = useState("");
      return (
        <>
          <Autocomplete
            ariaLabel="Search damage"
            options={OPTIONS}
            value={value}
            onValueChange={(next) => {
              setValue(next);
              onSelect(next);
            }}
          />
          <output>{value}</output>
        </>
      );
    }
    render(
      <>
        <Select
          ariaLabel="Damage choice"
          options={OPTIONS}
          value="arcane"
          onValueChange={vi.fn()}
        />
        <AutocompleteHarness />
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Damage choice" }));
    expect(screen.getByRole("option", { name: "Arcane" })).toHaveAttribute("data-selected");
    expect(screen.getByRole("option", { name: "Fire" })).toHaveAttribute("data-disabled");

    const autocomplete = screen.getByRole("combobox", { name: "Search damage" });
    await user.type(autocomplete, "custom damage");
    expect(onSelect).toHaveBeenLastCalledWith("custom damage");
    expect(screen.getByText("custom damage")).toBeVisible();
  });

  it("commits a listed combobox item with keyboard input", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ControlledCombobox onValueChange={onValueChange} />);
    const combobox = screen.getByRole("combobox", { name: "Damage type" });

    await user.click(combobox);
    await user.type(combobox, "Nature");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenLastCalledWith("nature");
    expect(combobox).toHaveValue("Nature");
  });

  it("supports segmented radio choices and checkbox groups", async () => {
    const user = userEvent.setup();
    const onRadioChange = vi.fn();
    const onCheckboxChange = vi.fn();
    render(
      <>
        <RadioGroup
          ariaLabel="Turn order"
          options={[
            { value: "player", label: "Player" },
            { value: "monster", label: "Monster" },
          ]}
          value="player"
          onValueChange={onRadioChange}
        />
        <CheckboxGroup
          label="Conditions"
          options={[{ value: "poisoned", label: "Poisoned" }]}
          value={[]}
          onValueChange={onCheckboxChange}
        />
      </>,
    );

    await user.click(screen.getByRole("radio", { name: "Monster" }));
    await user.click(screen.getByRole("checkbox", { name: "Poisoned" }));
    expect(onRadioChange).toHaveBeenCalledWith("monster");
    expect(onCheckboxChange).toHaveBeenCalledWith(["poisoned"]);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DiceRollField } from "../DiceRollField";

function ControlledDiceRollField({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <DiceRollField
      label="Damage"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("DiceRollField", () => {
  it("renders controlled values with accessible names for each control", () => {
    render(<ControlledDiceRollField initialValue="2d6+3" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Damage dice count" })).toHaveTextContent("2");
    expect(screen.getByRole("combobox", { name: "Damage die type" })).toHaveTextContent("d6");
    expect(screen.getByRole("textbox", { name: "Damage modifier" })).toHaveValue("+3");
  });

  it("keeps the explicit blank count option and dice-count formatting", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledDiceRollField initialValue="2d6+3" onChange={onChange} />);
    const count = screen.getByRole("combobox", { name: "Damage dice count" });

    await user.click(count);
    await user.click(await screen.findByRole("option", { name: "3" }));
    expect(onChange).toHaveBeenLastCalledWith("3d6+3");

    await user.click(count);
    await user.click(await screen.findByRole("option", { name: "—" }));
    expect(onChange).toHaveBeenLastCalledWith("1d6+3");
  });

  it("keeps the explicit blank die option and empty-die formatting", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledDiceRollField initialValue="2d6+3" onChange={onChange} />);
    const dieType = screen.getByRole("combobox", { name: "Damage die type" });

    await user.click(dieType);
    await user.click(await screen.findByRole("option", { name: "d8" }));
    expect(onChange).toHaveBeenLastCalledWith("2d8+3");

    await user.click(dieType);
    await user.click(await screen.findByRole("option", { name: "—" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("keeps modifier text changes as formatted string callbacks", () => {
    const onChange = vi.fn();
    render(<ControlledDiceRollField initialValue="2d6+3" onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Damage modifier" }), {
      target: { value: "-2" },
    });

    expect(onChange).toHaveBeenLastCalledWith("2d6-2");
    expect(screen.getByRole("textbox", { name: "Damage modifier" })).toHaveValue("-2");
  });
});

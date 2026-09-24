import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Fieldset } from "./Fieldset";
import { Form } from "./Form";
import { NumberField } from "./NumberField";
import { OtpField } from "./OtpField";
import { Slider } from "./Slider";
import { Switch } from "./Switch";
import { Toggle } from "./Toggle";
import { ToggleGroup } from "./ToggleGroup";

describe("advanced form controls", () => {
  it("groups controls and supplies a native accessible group", () => {
    render(
      <Fieldset legend="Settings">
        <input aria-label="Coordinates" />
      </Fieldset>,
    );
    expect(screen.getByRole("group", { name: "Settings" })).toBeVisible();
  });
  it("supports form layout and submits", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(
      <Form aria-label="Profile" onFormSubmit={submit}>
        <button type="submit">Save</button>
      </Form>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(submit).toHaveBeenCalled();
  });
  it("increments a number field", async () => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(<NumberField label="Depth" defaultValue={5} onValueChange={change} />);
    await user.click(screen.getByRole("button", { name: "Increase value" }));
    expect(change).toHaveBeenLastCalledWith(6);
  });
  it("renders OTP slots and single/range slider thumbs", () => {
    const { rerender } = render(<OtpField label="Code" length={4} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    rerender(<Slider label="Range" defaultValue={[-2, 2]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
  it("reports changes for switch and both toggle APIs", async () => {
    const checked = vi.fn();
    const pressed = vi.fn();
    const values = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <Switch label="Coordinates" onCheckedChange={checked} />
        <Toggle onPressedChange={pressed}>Pin</Toggle>
        <ToggleGroup
          aria-label="Overlays"
          multiple
          options={[{ value: "arrows", label: "Arrows" }]}
          onValueChange={values}
        />
      </>,
    );
    await user.click(screen.getByText("Coordinates"));
    await user.click(screen.getByRole("button", { name: "Pin" }));
    await user.click(screen.getByRole("button", { name: "Arrows" }));
    expect(checked).toHaveBeenLastCalledWith(true);
    expect(pressed).toHaveBeenLastCalledWith(true);
    expect(values).toHaveBeenLastCalledWith(["arrows"]);
  });
});

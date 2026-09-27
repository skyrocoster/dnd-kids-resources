import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fieldset } from "./Fieldset";
import { Form } from "./Form";
import { NumberField } from "./NumberField";
import { OtpField } from "./OtpField";
import { Slider } from "./Slider";
import { Switch } from "./Switch";
import { Toggle } from "./Toggle";
import { ToggleGroup } from "./ToggleGroup";

const meta = {
  title: "Production/Design System/Forms/Advanced Controls",
  tags: ["status-production"],
} satisfies Meta;
export default meta;
export const Examples: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "22rem" }}>
      <Fieldset legend="Preferences" description="Choose the controls to enable.">
        <Switch label="Show coordinates" defaultChecked />
      </Fieldset>
      <Form>
        <NumberField label="Daily goal" defaultValue={10} min={1} />
        <OtpField label="Verification code" length={6} />
      </Form>
      <Slider label="Evaluation window" defaultValue={[-3, 3]} min={-10} max={10} />
      <Toggle defaultPressed>Pin variation</Toggle>
      <ToggleGroup
        aria-label="Overlays"
        options={[
          { value: "arrows", label: "Arrows" },
          { value: "squares", label: "Squares" },
        ]}
        multiple
      />
    </div>
  ),
};

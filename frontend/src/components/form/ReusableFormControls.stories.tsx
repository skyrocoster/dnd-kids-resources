import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Autocomplete } from "./Autocomplete";
import { CheckboxField } from "./CheckboxField";
import { CheckboxGroup } from "./CheckboxGroup";
import { Combobox } from "./Combobox";
import { DropdownItemBody, DropdownMessage } from "./DropdownParts";
import { DropdownOptionContent } from "./DropdownOptionContent";
import { Field } from "./Field";
import { MultiSelectField } from "./MultiSelectField";
import { RadioGroup } from "./RadioGroup";
import { Select } from "./Select";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";
import { TextInput } from "./TextInput";

const meta = {
  title: "Production/Design System/Forms/Reusable Controls",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const damageOptions = [
  { value: "arcane", label: "Arcane", content: { secondary: "Magical energy" } },
  { value: "nature", label: "Nature", content: { secondary: "Plants and beasts" } },
  { value: "fire", label: "Fire", disabled: true },
] as const;

export const AutocompleteSuggestions: Story = {
  name: "Autocomplete — suggestions",
  render: () => (
    <div style={{ width: 360 }}>
      <Autocomplete
        ariaLabel="Search a damage type"
        options={damageOptions}
        value=""
        onValueChange={fn()}
        placeholder="Search damage types"
      />
    </div>
  ),
};

export const CheckboxFieldDefault: Story = {
  name: "Checkbox field — unchecked",
  render: () => <CheckboxField label="Prepared for today" />,
};

export const CheckboxGroupSelected: Story = {
  name: "Checkbox group — selected options",
  render: () => (
    <CheckboxGroup
      label="Conditions"
      description="Conditions affecting this creature."
      options={[
        { value: "poisoned", label: "Poisoned", description: "Disadvantage on attack rolls." },
        { value: "prone", label: "Prone" },
      ]}
      value={["poisoned"]}
      onValueChange={fn()}
    />
  ),
};

export const ComboboxSelection: Story = {
  name: "Combobox — searchable selection",
  render: () => (
    <div style={{ width: 360 }}>
      <Combobox ariaLabel="Choose a damage type" options={damageOptions} value="arcane" onValueChange={fn()} />
    </div>
  ),
};

export const DropdownOptionAnatomy: Story = {
  name: "Dropdown option — content building blocks",
  render: () => (
    <div className="fc-dropdown-item" style={{ width: 360, display: "grid", gap: 12 }}>
      <DropdownItemBody
        option={{
          value: "healing-potion",
          label: "Potion of healing",
          content: { leading: "🧪", secondary: "Restores hit points", trailing: "50 gp" },
        }}
      />
      <DropdownOptionContent leading="✦" primary="Magic missile" secondary="Evocation · level 1" trailing="1 action" />
      <DropdownMessage>No matching references.</DropdownMessage>
    </div>
  ),
};

export const FieldWithValidation: Story = {
  name: "Field — description and validation",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Field
        label="Character name"
        htmlFor="story-character-name"
        description="Use the name shown on the character sheet."
        invalid
        error="Enter a character name."
      >
        <TextInput id="story-character-name" invalid defaultValue="" />
      </Field>
    </div>
  ),
};

export const MultiSelectValues: Story = {
  name: "Multi-select field — chosen proficiencies",
  render: () => (
    <MultiSelectField
      label="Proficiencies"
      options={[{ value: "arcana", label: "Arcana" }, { value: "nature", label: "Nature" }]}
      selected={["arcana"]}
      onChange={fn()}
    />
  ),
};

export const RadioGroupSegmented: Story = {
  name: "Radio group — turn order",
  render: () => (
    <RadioGroup
      ariaLabel="Current turn belongs to"
      options={[{ value: "party", label: "Party" }, { value: "creatures", label: "Creatures" }]}
      value="party"
      onValueChange={fn()}
    />
  ),
};

export const SelectClosed: Story = {
  name: "Select — selected damage type",
  render: () => (
    <div style={{ width: 360 }}>
      <Select ariaLabel="Damage type" options={damageOptions} value="nature" onValueChange={fn()} />
    </div>
  ),
};

export const SelectFieldNative: Story = {
  name: "Select field — native options",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SelectField
        label="Spell level"
        options={[{ value: "1", label: "Level 1" }, { value: "2", label: "Level 2" }]}
        defaultValue="1"
      />
    </div>
  ),
};

export const TextFieldInput: Story = {
  name: "Text field — single line",
  render: () => <div style={{ maxWidth: 360 }}><TextField label="Spell name" defaultValue="Guiding bolt" /></div>,
};

export const TextFieldMultiline: Story = {
  name: "Text field — multiline description",
  render: () => <div style={{ maxWidth: 360 }}><TextField label="Description" multiline rows={4} defaultValue="A streak of light streaks toward a creature." /></div>,
};

export const TextInputSlots: Story = {
  name: "Text input — leading and trailing content",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <label htmlFor="story-search-input">Search references</label>
      <TextInput id="story-search-input" type="search" leading={<span aria-hidden="true">⌕</span>} trailing={<span>⌘K</span>} placeholder="Spell, item, or creature" />
    </div>
  ),
};

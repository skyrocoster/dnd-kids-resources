import { useId } from "react";
import { Select } from "../../components/form/Select";
import { TextInput } from "../../components/form/TextInput";
import { DICE_COUNT_OPTIONS, DICE_TYPE_OPTIONS } from "./constants";
import { formatDiceString, parseDiceString } from "./dice";
import "./DiceRollField.css";

const diceCountSelectOptions = [
  { value: "", label: "—" },
  ...DICE_COUNT_OPTIONS.map((count) => ({ value: count, label: count })),
];

const diceTypeSelectOptions = [
  { value: "", label: "—" },
  ...DICE_TYPE_OPTIONS.map((dieType) => ({ value: dieType, label: `d${dieType}` })),
];

interface DiceRollFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function DiceRollField({ label, value, onChange }: DiceRollFieldProps) {
  const id = useId();
  const { count, dieType, mod } = parseDiceString(value);

  const update = (patch: Partial<{ count: string; dieType: string; mod: string }>) => {
    onChange(formatDiceString({ count, dieType, mod, ...patch }));
  };

  return (
    <div className="form-field dice-roll-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="dice-roll-group" id={id}>
        <Select
          ariaLabel={`${label} dice count`}
          options={diceCountSelectOptions}
          value={count}
          onValueChange={(next) => update({ count: next ?? "" })}
        />
        <span className="dice-roll-sep">d</span>
        <Select
          ariaLabel={`${label} die type`}
          options={diceTypeSelectOptions}
          value={dieType}
          onValueChange={(next) => update({ dieType: next ?? "" })}
        />
        <TextInput
          className="dice-roll-mod"
          aria-label={`${label} modifier`}
          placeholder="+0"
          value={mod}
          onChange={(e) => update({ mod: e.target.value })}
        />
      </div>
    </div>
  );
}

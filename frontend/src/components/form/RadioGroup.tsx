import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";
import "./form-controls.css";

export interface RadioOption { value: string; label: string; description?: string; disabled?: boolean }
export interface RadioGroupProps { options: readonly RadioOption[]; value: string; onValueChange: (value: string) => void; appearance?: "segmented" | "stacked"; ariaLabel: string; disabled?: boolean; readOnly?: boolean; required?: boolean; name?: string }
export function RadioGroup({ options, value, onValueChange, appearance = "segmented", ariaLabel, disabled, readOnly, required = true, name }: RadioGroupProps) {
  const groupId = useId();
  return <BaseRadioGroup aria-label={ariaLabel} className={appearance === "segmented" ? "fc-radio-segmented" : "fc-radio-stacked"} disabled={disabled} readOnly={readOnly} required={required} name={name} value={value} onValueChange={(next) => onValueChange(next)}>
    {options.map((option, index) => { const optionLabelId = `${groupId}-option-${index}`; return <label className="fc-radio-label" key={option.value}>
      <Radio.Root aria-labelledby={optionLabelId} className="fc-radio-root" disabled={option.disabled} value={option.value}><Radio.Indicator className="fc-radio-indicator" /></Radio.Root>
      <span className="fc-radio-copy" id={optionLabelId}><span>{option.label}</span>{option.description ? <span className="fc-radio-description">{option.description}</span> : null}</span>
    </label>; })}
  </BaseRadioGroup>;
}

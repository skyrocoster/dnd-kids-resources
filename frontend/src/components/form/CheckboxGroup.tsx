import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Check } from "lucide-react";
import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./form-controls.css";

export interface CheckboxOptionDefinition { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }
export interface CheckboxGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> { label: ReactNode; options: readonly CheckboxOptionDefinition[]; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void; name?: string; disabled?: boolean; readOnly?: boolean; required?: boolean; description?: ReactNode }
export function CheckboxGroup({ label, options, value, defaultValue, onValueChange, name, disabled, readOnly, required, description, className, ...rest }: CheckboxGroupProps) {
  const labelId = useId();
  return <div className={["fc-checkbox-field", className].filter(Boolean).join(" ")}><span className="fc-control-label" id={labelId}>{label}</span>{description ? <span className="fc-description">{description}</span> : null}
    <BaseCheckboxGroup {...rest} aria-labelledby={labelId} className="fc-checkbox-group" value={value} defaultValue={defaultValue} onValueChange={(next) => onValueChange?.(next)} allValues={options.map((option) => option.value)} disabled={disabled}>
      {options.map((option) => <label className="fc-checkbox-option" data-disabled={disabled || option.disabled ? "" : undefined} key={option.value}>
        <Checkbox.Root className="fc-checkbox-root" value={option.value} name={name} disabled={disabled || option.disabled} readOnly={readOnly} required={required}><Checkbox.Indicator className="fc-checkbox-indicator"><Check aria-hidden="true" /></Checkbox.Indicator></Checkbox.Root>
        <span className="fc-option-copy"><span>{option.label}</span>{option.description ? <span className="fc-option-description">{option.description}</span> : null}</span>
      </label>)}
    </BaseCheckboxGroup>
  </div>;
}

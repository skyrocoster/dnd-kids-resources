import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Check } from "lucide-react";
import { useId } from "react";
import "./form.css";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectField({ label, options, selected, onChange }: MultiSelectFieldProps) {
  const labelId = useId();

  return (
    <div className="form-field form-multiselect">
      <span className="form-label" id={labelId}>
        {label}
      </span>
      <BaseCheckboxGroup
        aria-labelledby={labelId}
        className="form-multiselect-options"
        value={selected}
        onValueChange={(nextValue) => onChange(nextValue)}
        allValues={options.map((option) => option.value)}
      >
        {options.map((option) => {
          return (
            <label className="form-field form-field-checkbox" key={option.value}>
              <Checkbox.Root className="form-multiselect-checkbox" value={option.value}>
                <Checkbox.Indicator className="form-multiselect-checkbox-indicator">
                  <Check aria-hidden="true" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="form-label form-label-checkbox">{option.label}</span>
            </label>
          );
        })}
      </BaseCheckboxGroup>
    </div>
  );
}

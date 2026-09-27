import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./advanced-form.css";
export interface SwitchProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "onChange"
> {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  uncheckedValue?: string;
}
export function Switch({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  readOnly,
  required,
  name,
  value,
  uncheckedValue,
  className,
  ...rest
}: SwitchProps) {
  return (
    <label className={["form-advanced-switch", className].filter(Boolean).join(" ")}>
      <BaseSwitch.Root
        {...rest}
        className="form-advanced-switch-root"
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(v) => onCheckedChange?.(v)}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        name={name}
        value={value}
        uncheckedValue={uncheckedValue}
      >
        <BaseSwitch.Thumb className="form-advanced-switch-thumb" />
      </BaseSwitch.Root>
      <span className="form-advanced-switch-copy">
        <span className="form-advanced-label">{label}</span>
        {description && <span className="form-advanced-description">{description}</span>}
      </span>
    </label>
  );
}

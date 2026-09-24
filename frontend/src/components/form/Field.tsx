import { Field as BaseField } from "@base-ui/react/field";
import type { ReactNode } from "react";
import "./form-controls.css";

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}
export function Field({
  label,
  children,
  description,
  error,
  htmlFor,
  name,
  required = false,
  disabled = false,
  invalid = false,
  className,
}: FieldProps) {
  return (
    <BaseField.Root
      className={["fc-field", className].filter(Boolean).join(" ")}
      disabled={disabled}
      invalid={invalid}
      name={name}
    >
      <BaseField.Label className="fc-field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="fc-required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </BaseField.Label>
      {description ? (
        <BaseField.Description className="fc-field-description">
          {description}
        </BaseField.Description>
      ) : null}
      {children}
      {error ? (
        <BaseField.Error className="fc-field-error" match={invalid}>
          {error}
        </BaseField.Error>
      ) : null}
    </BaseField.Root>
  );
}

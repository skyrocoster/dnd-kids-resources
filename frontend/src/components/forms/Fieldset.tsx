import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./advanced-form.css";
export interface FieldsetProps extends ComponentPropsWithoutRef<"fieldset"> {
  legend: ReactNode;
  description?: ReactNode;
}
export function Fieldset({ legend, description, className, children, ...rest }: FieldsetProps) {
  return (
    <BaseFieldset.Root
      {...rest}
      className={["form-advanced-fieldset", className].filter(Boolean).join(" ")}
    >
      <BaseFieldset.Legend className="form-advanced-legend">{legend}</BaseFieldset.Legend>
      {description && <p className="form-advanced-description">{description}</p>}
      {children}
    </BaseFieldset.Root>
  );
}

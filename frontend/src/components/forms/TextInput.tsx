import { Input } from "@base-ui/react/input";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./form-controls.css";

export type TextInputType = "text" | "search" | "email" | "url" | "tel" | "password";
export interface TextInputProps extends Omit<ComponentPropsWithoutRef<"input">, "type" | "size"> {
  type?: TextInputType;
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export function TextInput({
  type = "text",
  leading,
  trailing,
  invalid = false,
  className,
  ...props
}: TextInputProps) {
  return (
    <span className="fc-input-frame" data-invalid={invalid || undefined}>
      {leading ? <span className="fc-input-slot">{leading}</span> : null}
      <Input
        {...props}
        aria-invalid={invalid || undefined}
        className={["fc-text-input", className].filter(Boolean).join(" ")}
        type={type}
      />
      {trailing ? <span className="fc-input-slot">{trailing}</span> : null}
    </span>
  );
}

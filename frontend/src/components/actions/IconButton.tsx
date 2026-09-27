import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Button } from "./Button";
import "./IconButton.css";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

export function IconButton({
  label,
  children,
  disabled,
  className,
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="compact"
      className={["btn", "btn--ghost", "btn--compact", "icon-btn", className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      disabled={disabled}
      type="button"
      {...rest}
    >
      {children}
    </Button>
  );
}

import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { ComponentPropsWithoutRef } from "react";
import "./ContentPrimitives.css";

export interface SeparatorProps extends ComponentPropsWithoutRef<"div"> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({ orientation = "horizontal", className, ...rest }: SeparatorProps) {
  return (
    <BaseSeparator
      {...rest}
      orientation={orientation}
      className={["cp-separator", className].filter(Boolean).join(" ")}
    />
  );
}

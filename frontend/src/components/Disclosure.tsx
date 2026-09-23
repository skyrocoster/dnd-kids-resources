import { Collapsible } from "@base-ui/react/collapsible";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./Disclosure.css";

export interface DisclosureProps extends ComponentPropsWithoutRef<"div"> {
  summary: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Disclosure({ summary, children, defaultOpen = false, open, onOpenChange, className, ...rest }: DisclosureProps) {
  return <Collapsible.Root className={["cmt-disclosure", className].filter(Boolean).join(" ")} defaultOpen={defaultOpen} open={open} onOpenChange={(next) => onOpenChange?.(next)} {...rest}>
    <Collapsible.Trigger className="cmt-disclosure__summary" type="button">{summary}</Collapsible.Trigger>
    <Collapsible.Panel className="cmt-disclosure__panel">{children}</Collapsible.Panel>
  </Collapsible.Root>;
}

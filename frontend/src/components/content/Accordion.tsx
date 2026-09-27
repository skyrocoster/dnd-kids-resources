import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./ContentPrimitives.css";

export interface AccordionItemDefinition {
  value: string;
  summary: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface AccordionProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "defaultValue" | "onChange"
> {
  items: readonly AccordionItemDefinition[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  keepMounted?: boolean;
  hiddenUntilFound?: boolean;
  itemClassName?: string;
  contentClassName?: string;
}

export function Accordion({
  items,
  value,
  defaultValue,
  onValueChange,
  multiple,
  disabled,
  keepMounted,
  hiddenUntilFound,
  itemClassName,
  contentClassName,
  className,
  ...rest
}: AccordionProps) {
  return (
    <BaseAccordion.Root
      {...rest}
      className={["cp-accordion", className].filter(Boolean).join(" ")}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next)}
      multiple={multiple}
      disabled={disabled}
      keepMounted={keepMounted}
      hiddenUntilFound={hiddenUntilFound}
    >
      {items.map((item) => (
        <BaseAccordion.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={["cp-accordion-item", itemClassName, item.className].filter(Boolean).join(" ")}
        >
          <BaseAccordion.Header className="cp-accordion-header">
            <BaseAccordion.Trigger className="cp-accordion-trigger">
              <span>{item.summary}</span>
              <ChevronDown className="cp-accordion-icon" aria-hidden="true" />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className="cp-accordion-panel">
            <div className={["cp-accordion-content", contentClassName].filter(Boolean).join(" ")}>
              {item.content}
            </div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}

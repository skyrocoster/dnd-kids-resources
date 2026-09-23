import type { ReactNode } from "react";
import { DropdownOptionContent, type DropdownOptionContentProps } from "./DropdownOptionContent";

export interface DropdownOptionDefinition {
  value: string;
  /** Required accessible name and default filtering/typeahead text. */
  label: string;
  disabled?: boolean;
  content?: Omit<DropdownOptionContentProps, "primary"> & { primary?: ReactNode };
  /** Replaces only the visual body; the owning control keeps option semantics and indicator. */
  customBody?: ReactNode;
}
export function DropdownItemBody({ option, indicator }: { option: DropdownOptionDefinition; indicator?: ReactNode }) {
  return <><span className="fc-option-body">{option.customBody ?? <DropdownOptionContent leading={option.content?.leading} primary={option.content?.primary ?? option.label} secondary={option.content?.secondary} trailing={option.content?.trailing} />}</span><span className="fc-option-indicator" aria-hidden="true">{indicator ?? "✓"}</span></>;
}
export function DropdownMessage({ children }: { children: ReactNode }) { return <span className="fc-dropdown-message">{children}</span>; }

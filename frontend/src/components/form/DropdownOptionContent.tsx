import type { ReactNode } from "react";
import "./form-controls.css";

export interface DropdownOptionContentProps { leading?: ReactNode; primary: ReactNode; secondary?: ReactNode; trailing?: ReactNode }
export function DropdownOptionContent({ leading, primary, secondary, trailing }: DropdownOptionContentProps) {
  return <span className="fc-option-anatomy">
    {leading ? <span className="fc-option-leading">{leading}</span> : null}
    <span className="fc-option-copy"><span className="fc-option-primary">{primary}</span>{secondary ? <span className="fc-option-secondary">{secondary}</span> : null}</span>
    {trailing ? <span className="fc-option-trailing">{trailing}</span> : null}
  </span>;
}

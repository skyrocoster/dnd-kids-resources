import type { CSSProperties } from "react";
import { FEEDBACK_VARIANTS } from "./feedbackTypes";
import type { FeedbackProps } from "./feedbackTypes";
import "./feedback.css";
export function FeedbackCore({
  severity,
  message,
  heading,
  role,
  "aria-live": ariaLive,
  "aria-atomic": ariaAtomic,
  "aria-relevant": ariaRelevant,
  "aria-busy": ariaBusy,
}: FeedbackProps) {
  const variant = FEEDBACK_VARIANTS[severity],
    Icon = variant.icon;
  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
      aria-busy={ariaBusy}
      className="ds-feedback-core"
      data-testid={`core-${severity}`}
      style={
        {
          "--ds-feedback-accent": `var(${variant.tokens.accent})`,
          "--ds-feedback-on-accent": `var(${variant.tokens.onAccent})`,
          "--ds-feedback-container": `var(${variant.tokens.container})`,
          "--ds-feedback-on-container": `var(${variant.tokens.onContainer})`,
        } as CSSProperties
      }
    >
      <Icon aria-hidden="true" className="ds-feedback-icon" data-testid={`icon-${severity}`} />
      <div className="ds-feedback-content">
        {heading && <h3 className="ds-feedback-heading">{heading}</h3>}
        <p className="ds-feedback-message">{message}</p>
      </div>
    </div>
  );
}

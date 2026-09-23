import type { FeedbackProps } from "./feedbackTypes";import { FeedbackCore } from "./FeedbackCore";import "./feedback.css";
export function PanelFeedback({severity,...props}:FeedbackProps){return <div className={`ds-feedback-panel ds-feedback-${severity}`} data-severity={severity}><FeedbackCore severity={severity} {...props}/></div>}

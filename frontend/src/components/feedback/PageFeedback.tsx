import type { FeedbackProps } from "./feedbackTypes";import { FeedbackCore } from "./FeedbackCore";import "./feedback.css";
export function PageFeedback({severity,...props}:FeedbackProps){return <div className={`ds-feedback-page ds-feedback-${severity}`} data-severity={severity}><FeedbackCore severity={severity} {...props}/></div>}

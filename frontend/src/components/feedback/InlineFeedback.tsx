import { FeedbackCore } from "./FeedbackCore";
import type { FeedbackProps } from "./feedbackTypes";
import "./feedback.css";
export function InlineFeedback(props: FeedbackProps) {
  return (
    <div className="ds-feedback-inline">
      <FeedbackCore {...props} />
    </div>
  );
}

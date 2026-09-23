import type { ComponentPropsWithoutRef } from "react";
import { CircleCheck,CircleX,Info,TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
export type FeedbackSeverity="information"|"success"|"warning"|"error";
export type FeedbackLiveRegionAttributes=Pick<ComponentPropsWithoutRef<"div">,"role"|"aria-live"|"aria-atomic"|"aria-relevant"|"aria-busy">;
export interface FeedbackProps extends FeedbackLiveRegionAttributes { severity:FeedbackSeverity; message:string; heading?:string }
export interface FeedbackVariantTokens {accent:string;onAccent:string;container:string;onContainer:string}
export interface FeedbackVariant {icon:LucideIcon;tokens:FeedbackVariantTokens}
export const FEEDBACK_VARIANTS:Record<FeedbackSeverity,FeedbackVariant>={information:{icon:Info,tokens:{accent:"--md-skill",onAccent:"--md-on-skill",container:"--md-skill-container",onContainer:"--md-on-skill-container"}},success:{icon:CircleCheck,tokens:{accent:"--md-nature",onAccent:"--md-on-nature",container:"--md-nature-container",onContainer:"--md-on-nature-container"}},warning:{icon:TriangleAlert,tokens:{accent:"--md-secondary",onAccent:"--md-on-secondary",container:"--md-secondary-container",onContainer:"--md-on-secondary-container"}},error:{icon:CircleX,tokens:{accent:"--md-error",onAccent:"--md-on-error",container:"--md-error-container",onContainer:"--md-on-error-container"}}};

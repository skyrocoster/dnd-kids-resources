import { Slider as BaseSlider } from "@base-ui/react/slider";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./advanced-form.css";

export type SliderValue = number | readonly number[];
export interface SliderProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "defaultValue" | "onChange"
> {
  label: ReactNode;
  value?: SliderValue;
  defaultValue?: SliderValue;
  onValueChange?: (value: SliderValue) => void;
  onValueCommitted?: (value: SliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  largeStep?: number;
  minStepsBetweenValues?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  name?: string;
  format?: Intl.NumberFormatOptions;
  locale?: Intl.LocalesArgument;
  showValue?: boolean;
  thumbAriaLabel?: string | readonly string[];
}
export function Slider({
  label,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min,
  max,
  step,
  largeStep,
  minStepsBetweenValues,
  disabled,
  orientation = "horizontal",
  name,
  format,
  locale,
  showValue = true,
  thumbAriaLabel,
  className,
  ...rest
}: SliderProps) {
  const current = value ?? defaultValue;
  const count = Array.isArray(current) ? Math.max(1, current.length) : 1;
  return (
    <BaseSlider.Root<SliderValue>
      {...rest}
      className={["form-advanced-slider", className].filter(Boolean).join(" ")}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v)}
      onValueCommitted={(v) => onValueCommitted?.(v)}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      minStepsBetweenValues={minStepsBetweenValues}
      disabled={disabled}
      orientation={orientation}
      name={name}
      format={format}
      locale={locale}
    >
      <div className="form-advanced-slider-heading">
        <BaseSlider.Label className="form-advanced-label">{label}</BaseSlider.Label>
        {showValue && <BaseSlider.Value className="form-advanced-slider-value" />}
      </div>
      <BaseSlider.Control className="form-advanced-slider-control">
        <BaseSlider.Track className="form-advanced-slider-track">
          <BaseSlider.Indicator className="form-advanced-slider-indicator" />
        </BaseSlider.Track>
        {Array.from({ length: count }, (_, i) => (
          <BaseSlider.Thumb
            className="form-advanced-slider-thumb"
            key={i}
            aria-label={
              Array.isArray(thumbAriaLabel)
                ? thumbAriaLabel[i]
                : (thumbAriaLabel ?? (count > 1 ? `Value ${i + 1}` : undefined))
            }
          />
        ))}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

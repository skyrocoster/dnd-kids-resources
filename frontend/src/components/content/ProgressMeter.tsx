import { Meter } from "@base-ui/react/meter";
import "./ProgressMeter.css";

export type ProgressMeterProps = {
  /** Determinate value in the [min, max] range. Null means unavailable: no meter role. */
  value: number | null;
  min?: number;
  max?: number;
  /** Accessible name for the determinate meter. */
  label: string;
  /** Accessible value text. Defaults to a rounded percent of the range. */
  valueText?: string;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ProgressMeter({
  value,
  min = 0,
  max = 100,
  label,
  valueText,
  className,
}: ProgressMeterProps) {
  if (value === null || Number.isNaN(value))
    return (
      <div
        className={["progress-meter", "progress-meter--unavailable", className]
          .filter(Boolean)
          .join(" ")}
        data-state="unavailable"
      >
        <div className="progress-meter__track" aria-hidden="true">
          <span className="progress-meter__indicator" style={{ inlineSize: "0%" }} />
        </div>
        <span className="progress-meter__unavailable-label">{valueText ?? "No data"}</span>
      </div>
    );
  const clamped = clamp(value, min, max);
  const percent = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
  return (
    <Meter.Root
      className={["progress-meter", className].filter(Boolean).join(" ")}
      min={min}
      max={max}
      value={Math.round(clamped * 100) / 100}
      aria-valuetext={valueText ?? `${Math.round(percent)}%`}
      data-state="determinate"
    >
      <Meter.Label className="progress-meter__visually-hidden">{label}</Meter.Label>
      <Meter.Track className="progress-meter__track">
        <Meter.Indicator
          className="progress-meter__indicator"
          style={{ inlineSize: `${percent}%` }}
        />
      </Meter.Track>
    </Meter.Root>
  );
}

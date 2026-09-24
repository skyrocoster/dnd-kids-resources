import { Popover } from "@base-ui/react/popover";
import { DayPicker, type ClassNames } from "react-day-picker";
import { useRef, useState } from "react";
import "./CalendarDate.css";
import {
  formatUtcDate,
  getUtcCalendarDay,
  isFutureUtcDate,
  normalizeToUtcMidnight,
  toUtcMidnight,
} from "./CalendarDateUtils";

export type CalendarDateValue = Date | null;
export interface CalendarDateProps {
  value: CalendarDateValue;
  onChange: (value: CalendarDateValue) => void;
  label?: string;
  /** Marks the trigger invalid without owning form-level error text. */
  invalid?: boolean;
  /** Links the trigger to external descriptive or error text. */
  describedBy?: string;
  /** Stable trigger id for external labels or errors. */
  triggerId?: string;
}

const calendarClassNames = {
  root: "calendar-date__calendar-root",
  chevron: "calendar-date__chevron",
  day: "calendar-date__day",
  day_button: "calendar-date__day-button",
  caption_label: "calendar-date__caption-label",
  dropdowns: "calendar-date__dropdowns",
  dropdown: "calendar-date__dropdown",
  dropdown_root: "calendar-date__dropdown-root",
  month_grid: "calendar-date__month-grid",
  month_caption: "calendar-date__month-caption",
  month: "calendar-date__month",
  months: "calendar-date__months",
  nav: "calendar-date__nav",
  button_next: "calendar-date__nav-button",
  button_previous: "calendar-date__nav-button",
  week: "calendar-date__week",
  weeks: "calendar-date__weeks",
  weekday: "calendar-date__weekday",
  weekdays: "calendar-date__weekdays",
  disabled: "calendar-date__disabled",
  focused: "calendar-date__focused",
  outside: "calendar-date__outside",
  selected: "calendar-date__selected",
  today: "calendar-date__today",
} satisfies Partial<ClassNames>;

export function CalendarDate({
  value,
  onChange,
  label = "Date",
  invalid = false,
  describedBy,
  triggerId,
}: CalendarDateProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const now = new Date();
  const today = toUtcMidnight(getUtcCalendarDay(now));
  const selected = value ? normalizeToUtcMidnight(value) : undefined;
  const displayValue = value ? formatUtcDate(value) : "Choose date";
  const handleSelect = (date: Date | undefined) => {
    onChange(date ? normalizeToUtcMidnight(date) : null);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} modal onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        id={triggerId}
        className="calendar-date__trigger"
        aria-label={`${label}: ${displayValue}`}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      >
        <span aria-hidden="true">{displayValue}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop className="calendar-date__backdrop" />
        <Popover.Positioner
          className="calendar-date__positioner"
          side="bottom"
          align="start"
          sideOffset={8}
        >
          <Popover.Popup
            className="calendar-date__popup"
            initialFocus
            finalFocus={triggerRef}
            data-testid="calendar-date-popup"
          >
            <Popover.Title className="calendar-date__title">{label}</Popover.Title>
            <Popover.Description className="calendar-date__description">
              Select a date.
            </Popover.Description>
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? today}
              today={today}
              endMonth={today}
              disabled={(date) => isFutureUtcDate(date, now)}
              timeZone="UTC"
              aria-label={`${label} calendar`}
              classNames={calendarClassNames}
            />
            <div className="calendar-date__actions">
              <button
                type="button"
                className="calendar-date__clear-button"
                disabled={!value}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear date
              </button>
              <Popover.Close className="calendar-date__close-button" aria-label="Close calendar">
                Close
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

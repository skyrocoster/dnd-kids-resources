export interface UtcCalendarDay {
  year: number;
  month: number;
  day: number;
}

/** Return UTC calendar-day parts without consulting local time. */
export function getUtcCalendarDay(instant: Date): UtcCalendarDay {
  if (Number.isNaN(instant.getTime())) throw new RangeError("Calendar date must be valid");
  return {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth(),
    day: instant.getUTCDate(),
  };
}

export function toUtcMidnight(day: UtcCalendarDay): Date {
  return new Date(Date.UTC(day.year, day.month, day.day, 0, 0, 0, 0));
}

export function normalizeToUtcMidnight(instant: Date): Date {
  return toUtcMidnight(getUtcCalendarDay(instant));
}

export function isFutureUtcDate(candidate: Date, now: Date): boolean {
  const a = getUtcCalendarDay(candidate);
  const b = getUtcCalendarDay(now);
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  return a.day > b.day;
}

export function formatUtcDate(value: Date): string {
  const { year, month, day } = getUtcCalendarDay(value);
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

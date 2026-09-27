import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarDate, type CalendarDateValue } from "../CalendarDate";
import {
  formatUtcDate,
  getUtcCalendarDay,
  normalizeToUtcMidnight,
  toUtcMidnight,
} from "../CalendarDateUtils";

describe("CalendarDate UTC helpers", () => {
  it("formats and normalizes a UTC calendar day", () => {
    const instant = new Date("2025-01-15T23:59:59.999Z");
    expect(formatUtcDate(instant)).toBe("2025-01-15");
    expect(normalizeToUtcMidnight(instant).toISOString()).toBe("2025-01-15T00:00:00.000Z");
    expect(getUtcCalendarDay(toUtcMidnight({ year: 2025, month: 0, day: 15 }))).toEqual({
      year: 2025,
      month: 0,
      day: 15,
    });
  });
});

describe("CalendarDate", () => {
  it("opens a calendar, selects a day as UTC midnight, and closes", async () => {
    const user = userEvent.setup();
    let value: CalendarDateValue = new Date("2025-01-15T00:00:00.000Z");
    const onChange = vi.fn((next: CalendarDateValue) => {
      value = next;
    });
    render(<CalendarDate value={value} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Date: 2025-01-15" }));
    const dialog = await screen.findByRole("dialog", { name: "Date" });
    await user.click(within(dialog).getByRole("button", { name: /January 20th, 2025/ }));
    expect(onChange).toHaveBeenCalledWith(new Date("2025-01-20T00:00:00.000Z"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears the selected date and closes with focus returned to the trigger", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CalendarDate value={new Date("2025-01-15T00:00:00.000Z")} onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: "Date: 2025-01-15" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Date" });
    const clearButton = within(dialog).getByRole("button", { name: "Clear date" });

    expect(clearButton).toHaveAttribute("type", "button");
    expect(clearButton).toHaveClass("calendar-date__clear-button");
    expect(clearButton).toBeEnabled();
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps Clear date disabled without a value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CalendarDate value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Date: Choose date" }));
    const dialog = await screen.findByRole("dialog", { name: "Date" });
    const clearButton = within(dialog).getByRole("button", { name: "Clear date" });

    expect(clearButton).toHaveAttribute("type", "button");
    expect(clearButton).toBeDisabled();
    await user.click(clearButton);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Date" })).toBeInTheDocument();
  });
});

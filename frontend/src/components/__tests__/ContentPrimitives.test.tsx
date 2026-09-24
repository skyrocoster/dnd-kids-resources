import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Accordion } from "../Accordion";
import { Avatar } from "../Avatar";
import { ScrollArea } from "../ScrollArea";
import { Separator } from "../Separator";

afterEach(cleanup);

describe("content primitives", () => {
  it("toggles accordion panels", async () => {
    const user = userEvent.setup();
    render(
      <Accordion
        items={[{ value: "idea", summary: "Training idea", content: "Repeat the move." }]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Training idea" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Repeat the move.")).toBeVisible();
  });
  it("renders avatar fallback", () => {
    render(<Avatar alt="Alex Morgan" fallback="AM" size="sm" />);
    expect(screen.getByText("AM")).toBeVisible();
  });
  it("renders scroll content and accessible separator", () => {
    render(
      <>
        <ScrollArea aria-label="Move history" orientation="both">
          <p>1. e4 e5</p>
        </ScrollArea>
        <Separator orientation="vertical" />
      </>,
    );
    expect(screen.getByText("1. e4 e5")).toBeVisible();
    expect(screen.getByLabelText("Move history")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});

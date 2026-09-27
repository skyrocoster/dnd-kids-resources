import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "../Tooltip";

describe("Tooltip", () => {
  it("renders the trigger as a focusable button", () => {
    render(<Tooltip trigger="?" content="Keyboard shortcuts" />);
    expect(screen.getByRole("button", { name: "?" })).toBeInTheDocument();
  });

  it("shows content when defaultOpen is true", () => {
    render(<Tooltip defaultOpen trigger="?" content="Keyboard shortcuts" />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Keyboard shortcuts");
  });

  it("merges a custom popup class", () => {
    render(<Tooltip defaultOpen trigger="?" content="Hints" popupClassName="custom-tip" />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("custom-tip");
  });
});

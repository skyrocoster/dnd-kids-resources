import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressMeter } from "../ProgressMeter";

describe("ProgressMeter", () => {
  it("exposes the determinate value and value text", () => {
    render(<ProgressMeter value={75} label="Engine analysis" valueText="75%" />);
    expect(screen.getByRole("meter", { name: "Engine analysis" })).toHaveAttribute(
      "aria-valuenow",
      "75",
    );
    expect(screen.getByRole("meter", { name: "Engine analysis" })).toHaveAttribute(
      "aria-valuetext",
      "75%",
    );
  });
  it("clamps the value to its range", () => {
    render(<ProgressMeter value={150} label="Coverage" />);
    expect(screen.getByRole("meter", { name: "Coverage" })).toHaveAttribute("aria-valuenow", "100");
  });
  it("shows unavailable data without a meter role", () => {
    render(<ProgressMeter value={null} label="Coverage" valueText="No coverage data" />);
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(screen.getByText("No coverage data")).toBeVisible();
  });
});

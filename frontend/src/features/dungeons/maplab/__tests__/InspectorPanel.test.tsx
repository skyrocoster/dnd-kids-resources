import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Inspectable, SessionFixtureState } from "../../../../model/maplabModel";
import { InspectorPanel } from "../InspectorPanel";

function doorTarget(session?: SessionFixtureState): Inspectable {
  return {
    kind: "door",
    door: {
      door_id: 1,
      cell: [1, 2],
      side: "N",
      title: "Iron Door",
      hidden: false,
      locked: true,
      trapped: false,
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: false },
          trap: { armed: false, shown: true },
        },
      },
    },
    ...(session ? { session } : {}),
  };
}

function expectNativeObstacleMatrix(container: HTMLElement) {
  const grid = container.querySelector(".maplab-inspector-obstacle-grid");
  expect(grid).not.toBeNull();

  for (const name of [
    "Concealment armed",
    "Lock armed",
    "Lock shown",
    "Trap armed",
    "Trap shown",
  ]) {
    expect(screen.getByRole("checkbox", { name }).parentElement).toBe(grid);
  }

  const open = screen.getByRole("checkbox", { name: "Open" });
  const openRow = container.querySelector(".maplab-inspector-open-row");
  expect(open.parentElement).toBe(openRow);
  expect(openRow).toHaveTextContent("Open");
}

describe("InspectorPanel obstacle controls", () => {
  it("uses DM View adapter values and callbacks for the full obstacle matrix and Reset", async () => {
    const user = userEvent.setup();
    const adapter = {
      heading: "World now" as const,
      onToggleOpen: vi.fn(),
      onToggleArmed: vi.fn(),
      onToggleShown: vi.fn(),
      onReset: vi.fn(),
    };
    const legacyControls = {
      onToggleOpen: vi.fn(),
      onToggleLocked: vi.fn(),
      onDisarmTrap: vi.fn(),
    };
    const { container } = render(
      <InspectorPanel
        target={doorTarget({
          open: true,
          obstacles: {
            concealment: { armed: false },
            lock: { armed: false, shown: true },
            trap: { armed: true, shown: false },
          },
        })}
        adapter={adapter}
        controls={legacyControls}
      />,
    );

    expect(screen.getByRole("heading", { name: "World now" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Open" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Concealment armed" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock armed" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock shown" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap armed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap shown" })).not.toBeChecked();
    for (const name of [
      "Open",
      "Concealment armed",
      "Lock armed",
      "Lock shown",
      "Trap armed",
      "Trap shown",
    ]) {
      expect(screen.getByRole("checkbox", { name })).toBeEnabled();
    }
    expectNativeObstacleMatrix(container);

    const reset = screen.getByRole("button", { name: "Reset to authored" });
    expect(reset).toBeEnabled();
    expect(reset).toHaveAttribute("type", "button");
    expect(reset).toHaveClass("maplab-pill-button", "maplab-inspector-reset-button");

    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    await user.click(screen.getByRole("checkbox", { name: "Concealment armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Lock armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Lock shown" }));
    await user.click(screen.getByRole("checkbox", { name: "Trap armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Trap shown" }));
    await user.click(reset);

    expect(adapter.onToggleOpen).toHaveBeenCalledWith(false);
    expect(adapter.onToggleArmed).toHaveBeenNthCalledWith(1, "concealment", true);
    expect(adapter.onToggleArmed).toHaveBeenNthCalledWith(2, "lock", true);
    expect(adapter.onToggleArmed).toHaveBeenNthCalledWith(3, "trap", false);
    expect(adapter.onToggleShown).toHaveBeenNthCalledWith(1, "lock", false);
    expect(adapter.onToggleShown).toHaveBeenNthCalledWith(2, "trap", true);
    expect(adapter.onReset).toHaveBeenCalledOnce();
    expect(legacyControls.onToggleOpen).not.toHaveBeenCalled();
    expect(legacyControls.onToggleLocked).not.toHaveBeenCalled();
    expect(legacyControls.onDisarmTrap).not.toHaveBeenCalled();
  });

  it("uses authored values for DM Edit and respects the adapter Reset disabled state", async () => {
    const user = userEvent.setup();
    const adapter = {
      heading: "Authored" as const,
      onToggleArmed: vi.fn(),
      onToggleShown: vi.fn(),
      onReset: vi.fn(),
      resetDisabled: true,
    };
    const { container } = render(<InspectorPanel target={doorTarget()} adapter={adapter} />);

    expect(screen.getByRole("heading", { name: "Authored" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Open" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Concealment armed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock armed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock shown" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap armed" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap shown" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Open" })).toBeDisabled();
    for (const name of [
      "Concealment armed",
      "Lock armed",
      "Lock shown",
      "Trap armed",
      "Trap shown",
    ]) {
      expect(screen.getByRole("checkbox", { name })).toBeEnabled();
    }
    expectNativeObstacleMatrix(container);

    const reset = screen.getByRole("button", { name: "Reset to authored" });
    expect(reset).toBeDisabled();
    await user.click(reset);
    expect(adapter.onReset).not.toHaveBeenCalled();
  });

  it("preserves the distinct legacy controls fallbacks and read-only cells without an adapter", async () => {
    const user = userEvent.setup();
    const controls = {
      onToggleOpen: vi.fn(),
      onToggleLocked: vi.fn(),
      onDisarmTrap: vi.fn(),
    };
    const { container } = render(<InspectorPanel target={doorTarget()} controls={controls} />);

    expect(screen.getByRole("heading", { name: "World now" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Open" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Concealment armed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock armed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lock shown" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap armed" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Trap shown" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Open" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Concealment armed" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Lock armed" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Lock shown" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Trap armed" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Trap shown" })).toBeDisabled();
    expectNativeObstacleMatrix(container);
    expect(screen.queryByRole("button", { name: "Reset to authored" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    await user.click(screen.getByRole("checkbox", { name: "Concealment armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Lock armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Lock shown" }));
    await user.click(screen.getByRole("checkbox", { name: "Trap armed" }));
    await user.click(screen.getByRole("checkbox", { name: "Trap shown" }));

    expect(controls.onToggleOpen).toHaveBeenCalledOnce();
    expect(controls.onToggleLocked).toHaveBeenCalledOnce();
    expect(controls.onDisarmTrap).toHaveBeenCalledOnce();
  });
});

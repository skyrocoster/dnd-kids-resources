import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as api from "../../../api/client";
import { AddMonsterPanel } from "../AddMonsterPanel";

describe("AddMonsterPanel", () => {
  it("uses the shared icon button for close and calls onClose", async () => {
    vi.spyOn(api, "listMonsters").mockResolvedValue([]);
    const onClose = vi.fn();

    render(<AddMonsterPanel onAdd={() => {}} onClose={onClose} />);
    await act(async () => {
      await Promise.resolve();
    });

    const close = screen.getByRole("button", { name: "Close add monster panel" });
    expect(close).toHaveAttribute("type", "button");
    expect(close).toHaveClass(
      "btn",
      "btn--ghost",
      "btn--compact",
      "icon-btn",
      "add-monster-panel-close",
    );
    expect(close).toHaveTextContent("×");

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

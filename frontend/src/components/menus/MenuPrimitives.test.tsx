import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu } from "./ContextMenu";
import { Menu } from "./Menu";
import { Menubar } from "./Menubar";

describe("menu primitives", () => {
  it("runs a selected menu action", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        trigger="Actions"
        items={[{ id: "copy", label: "Copy name", textValue: "Copy name", onSelect }]}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy name" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("opens a context menu on a region gesture", () => {
    render(
      <ContextMenu items={[{ id: "note", label: "Add note", textValue: "Add note" }]}>
        <span>Encounter row</span>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText("Encounter row"));
    expect(screen.getByRole("menuitem", { name: "Add note" })).toBeInTheDocument();
  });

  it("renders menu triggers inside an accessible menubar", () => {
    render(
      <Menubar
        aria-label="Application actions"
        menus={[
          { id: "file", label: "File", items: [{ id: "save", label: "Save", textValue: "Save" }] },
          { id: "edit", label: "Edit", items: [{ id: "undo", label: "Undo", textValue: "Undo" }] },
        ]}
      />,
    );

    expect(screen.getByRole("menubar", { name: "Application actions" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "File" })).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeVisible();
  });
});

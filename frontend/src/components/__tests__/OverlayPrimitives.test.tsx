import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog } from "../Dialog";
import { PreviewCard } from "../PreviewCard";
import { ToastProvider, useToast } from "../Toast";
import { Tooltip } from "../Tooltip";

function ToastButton() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.add({ title: "Saved", description: "Your changes were saved." })}
    >
      Notify
    </button>
  );
}

describe("overlay primitives", () => {
  it("supports the compound dialog API and closes from its close control", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen title="Choose a spell">
        <p>Spell details</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Choose a spell" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Choose a spell" })).not.toBeInTheDocument();
  });

  it("renders a link preview and tooltip content", () => {
    render(
      <>
        <PreviewCard defaultOpen href="/spells" trigger="Spell list">
          <strong>Spell details</strong>
        </PreviewCard>
        <Tooltip defaultOpen trigger="?" content="Helpful hint" />
      </>,
    );

    expect(screen.getByRole("link", { name: "Spell list" })).toHaveAttribute("href", "/spells");
    expect(screen.getByText("Spell details")).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Helpful hint");
  });

  it("shows and dismisses notifications from the toast provider", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider timeout={0}>
        <ToastButton />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(screen.getByText("Your changes were saved.")).toBeVisible();
    await user.click(screen.getByText("Dismiss"));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});

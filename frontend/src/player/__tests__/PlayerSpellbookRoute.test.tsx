import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerSpellbookSessionProvider } from "../PlayerSpellbookSession";
import { PlayerSpellbookRoute } from "../PlayerSpellbookRoute";

vi.mock("../usePlayerSpellbook", () => ({
  usePlayerSpellbook: () => ({
    characters: [
      { id: "wizard", name: "Wizard" },
      { id: "ranger", name: "Ranger" },
    ],
    status: "success",
  }),
}));

function renderRoute() {
  return render(
    <PlayerSpellbookSessionProvider>
      <PlayerSpellbookRoute />
    </PlayerSpellbookSessionProvider>,
  );
}

describe("PlayerSpellbookRoute character choices", () => {
  it("exposes a named group of exclusive pressed buttons without tab or panel claims", async () => {
    const user = userEvent.setup();
    renderRoute();

    const group = screen.getByRole("group", { name: "Characters" });
    const wizard = within(group).getByRole("button", { name: "Wizard" });
    const ranger = within(group).getByRole("button", { name: "Ranger" });

    expect(wizard).toHaveAttribute("aria-pressed", "true");
    expect(ranger).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();

    await user.click(ranger);

    expect(wizard).toHaveAttribute("aria-pressed", "false");
    expect(ranger).toHaveAttribute("aria-pressed", "true");
  });

  it("supports Enter and Space keyboard activation", async () => {
    const user = userEvent.setup();
    renderRoute();

    const group = screen.getByRole("group", { name: "Characters" });
    const wizard = within(group).getByRole("button", { name: "Wizard" });
    const ranger = within(group).getByRole("button", { name: "Ranger" });

    ranger.focus();
    await user.keyboard("{Enter}");
    expect(ranger).toHaveAttribute("aria-pressed", "true");
    expect(wizard).toHaveAttribute("aria-pressed", "false");

    wizard.focus();
    await user.keyboard(" ");
    expect(wizard).toHaveAttribute("aria-pressed", "true");
    expect(ranger).toHaveAttribute("aria-pressed", "false");
  });

  it("supports arrow-key navigation within the shared choice group", async () => {
    const user = userEvent.setup();
    renderRoute();

    const group = screen.getByRole("group", { name: "Characters" });
    const wizard = within(group).getByRole("button", { name: "Wizard" });
    const ranger = within(group).getByRole("button", { name: "Ranger" });

    wizard.focus();
    await user.keyboard("{ArrowRight}");

    expect(ranger).toHaveFocus();
    await user.keyboard(" ");
    expect(ranger).toHaveAttribute("aria-pressed", "true");
    expect(wizard).toHaveAttribute("aria-pressed", "false");
  });

  it("does not clear the selected character when its choice is clicked again", async () => {
    const user = userEvent.setup();
    renderRoute();

    const group = screen.getByRole("group", { name: "Characters" });
    const wizard = within(group).getByRole("button", { name: "Wizard" });
    const ranger = within(group).getByRole("button", { name: "Ranger" });

    await user.click(wizard);

    expect(wizard).toHaveAttribute("aria-pressed", "true");
    expect(ranger).toHaveAttribute("aria-pressed", "false");
  });

  it("retains the selected character when the route child remounts under the same session provider", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PlayerSpellbookSessionProvider>
        <PlayerSpellbookRoute key="first-mount" />
      </PlayerSpellbookSessionProvider>,
    );

    const group = screen.getByRole("group", { name: "Characters" });
    await user.click(within(group).getByRole("button", { name: "Ranger" }));
    expect(within(group).getByRole("button", { name: "Ranger" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    rerender(
      <PlayerSpellbookSessionProvider>
        <PlayerSpellbookRoute key="second-mount" />
      </PlayerSpellbookSessionProvider>,
    );

    const remountedGroup = screen.getByRole("group", { name: "Characters" });
    expect(within(remountedGroup).getByRole("button", { name: "Ranger" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(remountedGroup).getByRole("button", { name: "Wizard" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import * as api from "../../../../api/client";
import { AppShell } from "../../../../layout/AppShell";
import { DungeonShell } from "../DungeonShell";
import { MapLabPage } from "../MapLabPage";
import { MapLabEditorPage } from "../MapLabEditorPage";
import { mapLabLayout } from "../maplabData";

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderDungeonRoute(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          {
            path: "dungeons/:dungeonId",
            element: <DungeonShell />,
            children: [
              { index: true, element: <MapLabPage /> },
              { path: "edit", element: <MapLabEditorPage /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.spyOn(api, "getDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
  vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
    data: mapLabLayout as unknown as Record<string, unknown>,
  });
  vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({
    data: mapLabLayout as unknown as Record<string, unknown>,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DungeonShell", () => {
  it("flags <body> for the fill layout while mounted and clears it on unmount", async () => {
    expect(document.body.dataset.appLayout).toBeUndefined();

    const { unmount } = renderDungeonRoute("/dungeons/4");
    await flush();
    // Drives the CSS that keeps the map inside the window instead of running off the bottom of the
    // page — a body attribute rather than a `:has()` selector, so tablet browsers honour it too.
    expect(document.body.dataset.appLayout).toBe("fill");

    unmount();
    expect(document.body.dataset.appLayout).toBeUndefined();
  });

  it("renders the same dungeon title in view and edit modes with sibling mode links", async () => {
    renderDungeonRoute("/dungeons/4");
    await flush();

    expect(screen.getByRole("heading", { name: "Map Lab" })).toBeInTheDocument();
    expect(screen.getByText("Test Dungeon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/dungeons/4");
    expect(screen.getByRole("link", { name: "Edit map" })).toHaveAttribute(
      "href",
      "/dungeons/4/edit",
    );

    fireEvent.click(screen.getByRole("link", { name: "Edit map" }));
    await flush();

    expect(screen.getByRole("heading", { name: "Map Lab" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/dungeons/4");
    expect(screen.getByRole("link", { name: "Edit map" })).toHaveAttribute(
      "href",
      "/dungeons/4/edit",
    );
    expect(screen.getByRole("link", { name: "Edit map" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the complete operational row in identity and leaves tabs empty", async () => {
    renderDungeonRoute("/dungeons/4");
    await flush();

    const identitySlot = document.querySelector(".app-row-slot--identity");
    const tabsSlot = document.querySelector(".app-row-slot--tabs");

    expect(identitySlot).toContainElement(screen.getByRole("heading", { name: "Map Lab" }));
    expect(identitySlot).toContainElement(screen.getByText("Test Dungeon"));
    expect(identitySlot).toContainElement(screen.getByRole("link", { name: "View" }));
    expect(identitySlot).toContainElement(screen.getByRole("link", { name: "Edit map" }));
    expect(identitySlot).toContainElement(document.querySelector(".dungeon-shell-status-slot"));
    expect(identitySlot).toContainElement(screen.getByRole("link", { name: "Back to dungeons" }));
    expect(tabsSlot).toBeEmptyDOMElement();
    expect(screen.getAllByRole("heading", { name: "Map Lab" })).toHaveLength(1);
    expect(document.querySelector(".dungeon-shell-subtitle")).not.toBeInTheDocument();
    expect(screen.queryByText(/Create rooms, shape their footprint/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Run the dungeon from the map/)).not.toBeInTheDocument();
  });

  it("renders a return-to-browser link to /dungeons", async () => {
    renderDungeonRoute("/dungeons/4");
    await flush();

    expect(screen.getByRole("link", { name: "Back to dungeons" })).toHaveAttribute(
      "href",
      "/dungeons",
    );
  });

  it("invalid ids render the shell error state without calling APIs", async () => {
    const getDungeonSpy = vi.spyOn(api, "getDungeon");
    const getLayoutSpy = vi.spyOn(api, "getDungeonLayout");

    renderDungeonRoute("/dungeons/not-a-number");
    await flush();

    expect(screen.getByText("Invalid dungeon URL.")).toBeInTheDocument();
    expect(getDungeonSpy).not.toHaveBeenCalled();
    expect(getLayoutSpy).not.toHaveBeenCalled();
  });

  it("missing dungeons render the shell missing state", async () => {
    vi.spyOn(api, "getDungeon").mockRejectedValue(new api.ApiError(404, "not found"));

    renderDungeonRoute("/dungeons/4");
    await flush();

    expect(screen.getByText("This dungeon does not exist.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Test Dungeon" })).not.toBeInTheDocument();
  });

  it("shows a recovery link when dungeon is missing", async () => {
    vi.spyOn(api, "getDungeon").mockRejectedValue(new api.ApiError(404, "not found"));

    renderDungeonRoute("/dungeons/4");
    await flush();

    const recovery = screen.getAllByRole("link", { name: "Back to dungeons" });
    expect(recovery.length).toBeGreaterThanOrEqual(1);
    expect(recovery[0]).toHaveAttribute("href", "/dungeons");
  });

  it("shows a recovery link when dungeon ID is invalid", async () => {
    renderDungeonRoute("/dungeons/not-a-number");
    await flush();

    const recovery = screen.getByRole("link", { name: "Back to dungeons" });
    expect(recovery).toHaveAttribute("href", "/dungeons");
  });

  it("shows a recovery link when dungeon fetch errors", async () => {
    vi.spyOn(api, "getDungeon").mockRejectedValue(new api.ApiError(500, "server error"));

    renderDungeonRoute("/dungeons/4");
    await flush();

    const recovery = screen.getAllByRole("link", { name: "Back to dungeons" });
    expect(recovery.length).toBeGreaterThanOrEqual(1);
    expect(recovery[0]).toHaveAttribute("href", "/dungeons");
  });

  it("layout 404 keeps the dungeon title visible while the child renders the blank map state", async () => {
    vi.spyOn(api, "getDungeonLayout").mockRejectedValue(new api.ApiError(404, "not found"));

    renderDungeonRoute("/dungeons/4");
    await flush();

    expect(screen.getByRole("heading", { name: "Map Lab" })).toBeInTheDocument();
    expect(
      screen.getByText("No saved layout yet. This dungeon is starting from a blank map."),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Starting Floor" })).toBeInTheDocument();
  });

  // ── VT2 responsive regions ────────────────────────────────────────────────────

  it("shell and child surfaces align at the 520px narrow breakpoint (VT2 responsive regions)", async () => {
    // VT2: Breakpoints reconciled to VF1 convention (520px/768px). This seam verifies that at
    // 520px the title, View/Edit links, and Back link remain visible without horizontal overflow,
    // and the child surface (MapLabPage) adapts to narrow layout.
    renderDungeonRoute("/dungeons/4");
    await flush();

    const shell = document.querySelector(".dungeon-shell") as HTMLElement;
    Object.defineProperty(shell, "offsetWidth", { value: 520 });

    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth + 1);
    expect(screen.getByRole("heading", { name: "Map Lab" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit map" })).toBeVisible();
  });

  it("room finder and details panel are reachable in narrow layout (VT2 narrow room access)", async () => {
    // VT2: At 520px, the room finder, map canvas, and RoomDetailsPanel must remain reachable
    // in the constrained composition.
    renderDungeonRoute("/dungeons/4");
    await flush();

    // At 520px, the finder must be accessible in the canvas composition.
    const canvas = document.querySelector(".maplab-canvas");
    expect(canvas).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Find room…" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Find room…" }));
    expect(screen.getByRole("searchbox", { name: "Find room…" })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("group", { name: /dungeon floor map/i })).getByRole("button", {
        name: "Combat Training Hall",
      }),
    );
    expect(document.querySelector(".maplab-sidebar")).toBeInTheDocument();
  });
});

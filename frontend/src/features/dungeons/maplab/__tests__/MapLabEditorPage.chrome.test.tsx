import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../../../api/client";
import { MapLabEditorPage } from "../MapLabEditorPage";
import { mapLabLayout } from "../maplabData";
import {
  DungeonRouteContextProvider,
  DungeonShellStatusSlotProvider,
} from "../dungeonRouteContext";

function renderMapLabEditorPage() {
  return render(
    <MemoryRouter initialEntries={["/dungeons/4/edit"]}>
      <DungeonRouteContextProvider
        value={{
          dungeonId: 4,
          dungeon: { id: 4, title: "Test Dungeon", data: {} },
          status: "ready",
          error: null,
        }}
      >
        <MapLabEditorPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function openViewPopover() {
  fireEvent.click(screen.getByRole("button", { name: "View" }));
}

describe("MapLabEditorPage (Stage E3 — Toolbar reorganization & persistent inspector)", () => {
  const oneRoomOneDoorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Room 1" }],
    doors: [{ door_id: 1, cell: [0, 0], side: "N", hidden: false, locked: false, trapped: false }],
    stairs: [],
    floors: [{ z: 0, title: "Ground Floor" }],
    props: [],
  };
  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Ground Room" },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: "Upper Room" },
    ],
    doors: [],
    stairs: [],
    floors: [
      { z: 0, title: "Ground Floor" },
      { z: 1, title: "First Floor" },
    ],
    props: [],
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: oneRoomOneDoorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: oneRoomOneDoorLayout });
  });

  it("toolbar separates Primary and Active tool options and folds Reset into the Map popover", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    const groups = container.querySelectorAll(".maplab-toolbar-group");
    expect(groups.length).toBeGreaterThanOrEqual(1);

    const labels = Array.from(groups).map(
      (group) => group.querySelector(".maplab-toolbar-group-label")?.textContent,
    );
    expect(labels).toEqual(expect.arrayContaining(["Primary", "Active tool options"]));

    const primaryGroup = Array.from(groups).find(
      (group) => group.querySelector(".maplab-toolbar-group-label")?.textContent === "Primary",
    );
    const activeOptionsGroup = Array.from(groups).find(
      (group) =>
        group.querySelector(".maplab-toolbar-group-label")?.textContent === "Active tool options",
    );
    expect(primaryGroup?.textContent).toMatch(/Select.*Room/);
    expect(activeOptionsGroup?.textContent).toMatch(/Passages.*Prop.*Terrain/);

    expect(screen.queryByRole("button", { name: "Reset unsaved changes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByRole("button", { name: "Reset unsaved changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find room…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New room" })).toBeInTheDocument();
  });

  it("Map popover remains exclusive with utilities and View, keeps internal actions open, and dismisses outside", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("dnd-kids-maplab-layer-visible:outside");
    renderMapLabEditorPage();
    await flush();

    await user.click(screen.getByRole("button", { name: "Find room…" }));
    expect(screen.getByRole("dialog", { name: "Find room" })).toBeInTheDocument();

    const mapTrigger = screen.getByRole("button", { name: "Map" });
    await user.click(mapTrigger);
    expect(screen.getByLabelText("Top")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Find room" })).not.toBeInTheDocument();

    const viewTrigger = screen.getByRole("button", { name: "View" });
    await user.click(viewTrigger);
    expect(screen.queryByLabelText("Top")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outside" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    window.localStorage.removeItem("dnd-kids-maplab-layer-visible:outside");
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.queryByRole("button", { name: "Labels" })).not.toBeInTheDocument();

    await user.click(mapTrigger);
    expect(screen.getByLabelText("Top")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.queryByLabelText("Top")).not.toBeInTheDocument();
  });

  it("Map popover leaves Escape dismissal to the editor and keeps the active tool armed", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    await user.click(screen.getByRole("button", { name: "Room" }));
    const mapTrigger = screen.getByRole("button", { name: "Map" });
    await user.click(mapTrigger);
    expect(mapTrigger).toHaveFocus();
    expect(screen.getByLabelText("Top")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("Top")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    expect(mapTrigger).toHaveFocus();
  });

  it("Connections popover retains its panel, dismisses outside without stealing focus, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    const connectionsTrigger = screen.getByRole("button", { name: /Connections/ });
    await user.click(connectionsTrigger);
    const panel = screen.getByRole("dialog", { name: "Connection utilities" });
    expect(panel.querySelector(".maplab-connections-resolve-list")).toBeInTheDocument();

    await user.click(panel.querySelector(".maplab-connections-resolve-list") as HTMLElement);
    expect(panel).toBeInTheDocument();

    const outsideTarget = screen.getByRole("button", { name: "Select" });
    await user.click(outsideTarget);
    expect(screen.queryByRole("dialog", { name: "Connection utilities" })).not.toBeInTheDocument();
    expect(outsideTarget).toHaveFocus();

    await user.click(connectionsTrigger);
    connectionsTrigger.blur();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Connection utilities" })).not.toBeInTheDocument();
    expect(connectionsTrigger).toHaveFocus();
  });

  it("searchable tool popovers retain their options, reset filters, and dismiss outside without stealing focus", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    const flyouts = [
      {
        trigger: "Choose passage tool",
        filter: "Filter passage tools",
        list: "passage tools",
        firstOption: "Door",
      },
      {
        trigger: "Choose prop kind",
        filter: "Filter prop tools",
        list: "prop tools",
        firstOption: "Chest",
      },
      {
        trigger: "Choose terrain tool",
        filter: "Filter terrain tools",
        list: "terrain tools",
        firstOption: "River",
      },
    ];

    for (const flyout of flyouts) {
      const trigger = screen.getByRole("button", { name: flyout.trigger });
      await user.click(trigger);
      const search = await screen.findByRole("searchbox", { name: flyout.filter });
      expect(search).toHaveFocus();
      expect(search).toHaveValue("");
      expect(screen.getByRole("list", { name: flyout.list })).toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: flyout.firstOption })).toBeInTheDocument();

      await user.type(search, "no matching tool");
      expect(screen.getByText("No tools match that.")).toBeInTheDocument();

      const outsideTarget = screen.getByRole("button", { name: "Select" });
      await user.click(outsideTarget);
      expect(screen.queryByRole("searchbox", { name: flyout.filter })).not.toBeInTheDocument();
      expect(outsideTarget).toHaveFocus();

      await user.click(trigger);
      const reopenedSearch = await screen.findByRole("searchbox", { name: flyout.filter });
      expect(reopenedSearch).toHaveFocus();
      expect(reopenedSearch).toHaveValue("");
      expect(screen.getByRole("button", { name: flyout.firstOption })).toBeInTheDocument();
      await user.click(outsideTarget);
      expect(outsideTarget).toHaveFocus();
    }
  });

  it("keeps tool choices as native buttons with accessible selected state and keyboard activation", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    await user.click(screen.getByRole("button", { name: "Choose passage tool" }));
    const search = await screen.findByRole("searchbox", { name: "Filter passage tools" });
    const door = screen.getByRole("button", { name: "Door" });
    expect(door).toHaveAttribute("aria-pressed", "false");

    await user.tab();
    expect(door).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("list", { name: "passage tools" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passage tools" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(search).not.toBeInTheDocument();
  });

  it("portals the save-status chip into the shell status slot instead of the toolbar", async () => {
    const slot = document.createElement("div");
    document.body.appendChild(slot);

    render(
      <MemoryRouter initialEntries={["/dungeons/4/edit"]}>
        <DungeonRouteContextProvider
          value={{
            dungeonId: 4,
            dungeon: { id: 4, title: "Test Dungeon", data: {} },
            status: "ready",
            error: null,
          }}
        >
          <DungeonShellStatusSlotProvider value={slot}>
            <MapLabEditorPage />
          </DungeonShellStatusSlotProvider>
        </DungeonRouteContextProvider>
      </MemoryRouter>,
    );
    await flush();

    expect(slot.querySelector(".maplab-editor-save-status")).toBeInTheDocument();

    document.body.removeChild(slot);
  });

  describe("Design Phase J1 — toolbar trays", () => {
    afterEach(() => {
      window.localStorage.removeItem("dnd-kids-maplab-tray-collapsed:editor-primary");
      window.localStorage.removeItem("dnd-kids-maplab-tray-collapsed:editor-active-options");
    });

    it("the Primary tray collapses independently and retains both trigger names and expanded states", async () => {
      const user = userEvent.setup();
      renderMapLabEditorPage();
      await flush();

      const primary = screen.getByRole("button", { name: "Collapse Primary tools" });
      const activeOptions = screen.getByRole("button", {
        name: "Collapse Active tool options tools",
      });
      expect(primary).toHaveAttribute("aria-expanded", "true");
      expect(activeOptions).toHaveAttribute("aria-expanded", "true");

      await user.click(primary);

      expect(screen.getByRole("button", { name: "Expand Primary tools" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        screen.getByRole("button", { name: "Collapse Active tool options tools" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: "Passage tools" })).toBeInTheDocument();
    });

    it("toolbar tray collapse state persists across remount via localStorage", async () => {
      window.localStorage.setItem("dnd-kids-maplab-tray-collapsed:editor-primary", "true");

      renderMapLabEditorPage();
      await flush();

      expect(screen.getByRole("button", { name: "Expand Primary tools" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        screen.getByRole("button", { name: "Collapse Active tool options tools" }),
      ).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("MapLabEditorPage (Stage 03 — layer toggles)", () => {
    afterEach(() => {
      for (const key of ["outside", "props", "passages", "labels"]) {
        window.localStorage.removeItem(`dnd-kids-maplab-layer-visible:${key}`);
      }
    });

    it("toggling Outside off hides the unknown-space rect and back on restores it", async () => {
      vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });
      vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });

      const { container } = renderMapLabEditorPage();
      await flush();

      expect(container.querySelector(".maplab-unknown-space")).toBeInTheDocument();

      openViewPopover();
      fireEvent.click(screen.getByRole("button", { name: "Outside" }));
      expect(container.querySelector(".maplab-unknown-space")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Outside" }));
      expect(container.querySelector(".maplab-unknown-space")).toBeInTheDocument();
    });

    it("toggling Props off hides prop markers and back on restores them", async () => {
      vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });
      vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });

      const { container } = renderMapLabEditorPage();
      await flush();

      expect(container.querySelector(".maplab-prop")).toBeInTheDocument();

      openViewPopover();
      fireEvent.click(screen.getByRole("button", { name: "Props" }));
      expect(container.querySelector(".maplab-prop")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Props" }));
      expect(container.querySelector(".maplab-prop")).toBeInTheDocument();
    });

    it("toggling Passages off hides doors and stairs together, and back on restores them", async () => {
      vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });
      vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });

      const { container } = renderMapLabEditorPage();
      await flush();

      expect(container.querySelector(".maplab-door")).toBeInTheDocument();
      expect(container.querySelector(".maplab-stair")).toBeInTheDocument();

      openViewPopover();
      fireEvent.click(screen.getByRole("button", { name: "Passages" }));
      expect(container.querySelector(".maplab-door")).not.toBeInTheDocument();
      expect(container.querySelector(".maplab-stair")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Passages" }));
      expect(container.querySelector(".maplab-door")).toBeInTheDocument();
      expect(container.querySelector(".maplab-stair")).toBeInTheDocument();
    });

    it("toggling Labels off hides room title text and back on restores it", async () => {
      vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });
      vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({
        data: mapLabLayout as unknown as Record<string, unknown>,
      });

      const { container } = renderMapLabEditorPage();
      await flush();

      expect(container.querySelector(".maplab-room-title")).toBeInTheDocument();

      openViewPopover();
      fireEvent.click(screen.getByRole("button", { name: "Labels" }));
      expect(container.querySelector(".maplab-room-title")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Labels" }));
      expect(container.querySelector(".maplab-room-title")).toBeInTheDocument();
    });
  });

  it("command band holds the room finder while floor creation controls remain labelled", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    expect(screen.getByRole("button", { name: "Find room…" })).toBeInTheDocument();
    expect(container.querySelector(".maplab-editor-nav-rail")).not.toBeInTheDocument();
    const toolbar = container.querySelector(".maplab-toolbar");
    const floorActions = toolbar?.querySelector(".maplab-editor-floor-actions");
    expect(floorActions).toBeInTheDocument();
    expect(floorActions?.textContent).toMatch(/Add floor above.*Add floor below/);
    expect(floorActions?.textContent).not.toMatch(/delete|connection/i);
  });

  it("finder results use the shared labelled room navigation contract", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    expect(screen.getByRole("button", { name: "Find room…" })).toBeInTheDocument();
    expect(container.querySelector(".maplab-viewer-rail")).toBeInTheDocument();
  });

  it("adds a new floor above the current floor and activates it", async () => {
    renderMapLabEditorPage();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Add floor above" }));

    const firstFloorChoice = screen.getByRole("button", { name: "First Floor" });
    expect(firstFloorChoice).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Find room…" })).toBeInTheDocument();
  });

  it("adds a new floor below the current floor and disables the add button once it exists", async () => {
    renderMapLabEditorPage();
    await flush();

    const addBelow = screen.getByRole("button", { name: "Add floor below" });
    expect(addBelow).toBeEnabled();

    fireEvent.click(addBelow);

    const basementChoice = screen.getByRole("button", { name: "Basement" });
    expect(basementChoice).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Add floor above" })).toBeDisabled();
  });

  it("keeps floor choices ordered and activates Add floor above with Enter", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    const addAbove = screen.getByRole("button", { name: "Add floor above" });
    addAbove.focus();
    await user.keyboard("{Enter}");

    const floorChoices = within(screen.getByRole("group", { name: "Dungeon floors" })).getAllByRole(
      "button",
    );
    expect(floorChoices.map((choice) => choice.textContent)).toEqual([
      "Ground Floor",
      "First Floor",
    ]);
    expect(screen.getByRole("button", { name: "First Floor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("activates Add floor below with Space and keeps the floor controls as native buttons", async () => {
    const user = userEvent.setup();
    renderMapLabEditorPage();
    await flush();

    const addBelow = screen.getByRole("button", { name: "Add floor below" });
    expect(addBelow.tagName).toBe("BUTTON");
    addBelow.focus();
    await user.keyboard(" ");

    expect(screen.getByRole("button", { name: "Basement" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Add floor above" })).toBeDisabled();
  });

  it("does not mount a desktop inspector rail without a selection", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    expect(container.querySelector(".maplab-inspector-rail")).not.toBeInTheDocument();
  });

  it("selecting a room mounts the desktop inspector rail", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    const room = container.querySelector(".maplab-room") as Element;
    fireEvent.click(room);

    const rail = container.querySelector(".maplab-inspector-rail");
    expect(rail?.textContent).toMatch(/Room 1/);
    expect(screen.getByRole("button", { name: "New room" })).toBeInTheDocument();
    expect(rail?.textContent).toMatch(/Delete room/);
  });

  it("opens a tablet selection sheet at peek height and expands its editor on demand", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    expect(container.querySelector(".maplab-inspector-rail")).not.toBeInTheDocument();

    const room = container.querySelector(".maplab-room") as Element;
    fireEvent.click(room);
    const sheet = container.querySelector(".maplab-selection-sheet") as HTMLElement;
    expect(sheet).toBeInTheDocument();
    expect(sheet).not.toHaveAttribute("data-expanded");
    const sheetToggle = sheet.querySelector(".maplab-selection-sheet-toggle") as HTMLButtonElement;
    expect(sheetToggle).toHaveTextContent("Edit");
    expect(sheetToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(sheetToggle);
    expect(sheet).toHaveAttribute("data-expanded");
    expect(sheetToggle).toHaveTextContent("Collapse editor");
    expect(sheetToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(sheet).not.toHaveAttribute("data-expanded");
  });

  it("floor choice group is inside the toolbar", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();

    const toolbar = container.querySelector(".maplab-toolbar");
    expect(
      toolbar?.querySelector('[role="group"][aria-label="Dungeon floors"]'),
    ).toBeInTheDocument();
  });

  it("uses controlled exclusive floor choices with horizontal keyboard selection and active map content", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    renderMapLabEditorPage();
    await flush();

    const floorGroup = screen.getByRole("group", { name: "Dungeon floors" });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    const choices = within(floorGroup).getAllByRole("button");
    expect(choices.map((choice) => choice.textContent)).toEqual(["Ground Floor", "First Floor"]);
    expect(choices[0]).toHaveAttribute("aria-pressed", "true");
    expect(choices[1]).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ground Room" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upper Room" })).not.toBeInTheDocument();

    await user.click(choices[0]);
    expect(choices[0]).toHaveAttribute("aria-pressed", "true");
    expect(choices[1]).toHaveAttribute("aria-pressed", "false");

    choices[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(choices[1]).toHaveFocus();
    await user.keyboard(" ");

    expect(choices[0]).toHaveAttribute("aria-pressed", "false");
    expect(choices[1]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Upper Room" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ground Room" })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as api from "../../../../api/client";
import type { Dungeon, NPC } from "../../../../api/types";
import { FixturePropertiesForm } from "../FixturePropertiesForm";
import { FIXTURE_TYPES } from "../fixtureTypes";
import type { MapLayout } from "../../../../model/maplabModel";

describe("FixturePropertiesForm", () => {
  it("renders a generic text field with its value and dispatches the string change", () => {
    const onChange = vi.fn();
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.prop}
        values={{ title: "Old chest", kind: "chest", hidden: false, locked: false, trapped: false }}
        onChange={onChange}
      />,
    );

    const title = screen.getByLabelText("Title") as HTMLInputElement;
    expect(title.value).toBe("Old chest");
    expect(title.closest(".maplab-field-row")).toBeInTheDocument();

    fireEvent.change(title, { target: { value: "New chest" } });
    expect(onChange).toHaveBeenCalledWith("title", "New chest");
  });

  it("renders a select field with the kind options and dispatches on change", () => {
    const onChange = vi.fn();
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.prop}
        values={{ kind: "chest", hidden: false, locked: false, trapped: false }}
        onChange={onChange}
      />,
    );

    const select = screen.getByLabelText("Kind") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("chest");
    expect(select).not.toBeDisabled();
    expect(select.closest(".maplab-field-row")).toBeInTheDocument();
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "chest",
      "table",
      "mirror",
      "barrel",
      "statue",
      "window",
      "encounter",
      "npc",
      "other",
    ]);
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "Chest",
      "Table",
      "Mirror",
      "Barrel",
      "Statue",
      "Window",
      "Encounter",
      "NPC",
      "Other",
    ]);

    fireEvent.change(select, { target: { value: "mirror" } });
    expect(onChange).toHaveBeenCalledWith("kind", "mirror");
  });

  it("uses a shared checkbox while retaining checked values and boolean callbacks", () => {
    const onChange = vi.fn();
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.door}
        values={{ hidden: true, locked: false, trapped: 0 }}
        onChange={onChange}
      />,
    );

    const hidden = screen.getByLabelText("Hidden") as HTMLInputElement;
    const locked = screen.getByLabelText("Locked") as HTMLInputElement;
    const trapped = screen.getByLabelText("Trapped") as HTMLInputElement;
    expect(hidden.checked).toBe(true);
    expect(locked.checked).toBe(false);
    expect(trapped.checked).toBe(false);
    expect(hidden).not.toBeDisabled();
    expect(hidden.closest(".maplab-field-row")).toHaveTextContent("Hidden");

    fireEvent.click(locked);
    expect(onChange).toHaveBeenCalledWith("locked", true);
  });

  it("keeps the native number input and maps blank and numeric input values", () => {
    const onChange = vi.fn();
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.door}
        values={{ hidden: false, locked: true, trapped: false, breakDc: 12 }}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Break DC") as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.value).toBe("12");
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: "2e1" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenNthCalledWith(1, "breakDc", Number("2e1"));
    expect(onChange).toHaveBeenNthCalledWith(2, "breakDc", undefined);
  });

  it("continues to gate DC fields with the current hidden and locked values", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.door}
        values={{ hidden: true, locked: false, trapped: false }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Perception DC")).toBeInTheDocument();
    expect(screen.getByLabelText("Search DC")).toBeInTheDocument();
    expect(screen.queryByLabelText("Break DC")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pick Lock DC")).not.toBeInTheDocument();

    rerender(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.door}
        values={{ hidden: false, locked: true, trapped: false }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByLabelText("Perception DC")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search DC")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Break DC")).toBeInTheDocument();
    expect(screen.getByLabelText("Pick Lock DC")).toBeInTheDocument();
  });

  it("maps the live encounter list to the selected numeric ID or null", async () => {
    vi.spyOn(api, "listEncounters").mockResolvedValue([
      { id: 5, title: "Goblin Ambush" },
      { id: 9, title: "Dragon Lair" },
    ]);
    const onChange = vi.fn();
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.prop}
        values={{ kind: "encounter", encounter_id: 5 }}
        onChange={onChange}
      />,
    );

    const select = (await screen.findByLabelText("Encounter")) as HTMLSelectElement;
    expect(select.value).toBe("5");
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "No encounter",
      "Goblin Ambush",
      "Dragon Lair",
    ]);
    expect(select).not.toBeDisabled();
    fireEvent.change(select, { target: { value: "9" } });
    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenNthCalledWith(1, "encounter_id", 9);
    expect(onChange).toHaveBeenNthCalledWith(2, "encounter_id", null);
  });

  describe("Phase M — Loot bundle picker", () => {
    it("shows bundle options and writes or clears prop.loot", async () => {
      vi.spyOn(api, "listLootBundles").mockResolvedValue([
        { id: 12, name: "Goblin Chest", gold: 25, contents: [] },
        { id: 24, name: "Wizard Cache", gold: 50, contents: [] },
      ]);
      const onChange = vi.fn();
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.prop}
          values={{
            kind: "chest",
            loot: { bundle_id: 12, bundle_name: "Goblin Chest" },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={onChange}
        />,
      );

      const select = (await screen.findByLabelText("Loot bundle")) as HTMLSelectElement;
      expect(select.value).toBe("12");
      expect(select).not.toBeDisabled();
      expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
        "No loot",
        "Goblin Chest",
        "Wizard Cache",
      ]);

      fireEvent.change(select, { target: { value: "24" } });
      expect(onChange).toHaveBeenCalledWith("loot", { bundle_id: 24, bundle_name: "Wizard Cache" });

      fireEvent.change(select, { target: { value: "" } });
      expect(onChange).toHaveBeenCalledWith("loot", null);
    });

    it("explains when no loot bundles can be loaded", async () => {
      vi.spyOn(api, "listLootBundles").mockRejectedValue(new Error("Offline"));
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.prop}
          values={{ kind: "chest", hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
        />,
      );

      expect(await screen.findByRole("status")).toHaveTextContent("Unable to load loot bundles.");
    });
  });

  describe("NPC picker", () => {
    it("shows NPC options by name and writes or clears npc_id", async () => {
      vi.spyOn(api, "listNPCs").mockResolvedValue([
        { id: 1, name: "Arendelle" },
        { id: 2, name: "Bjorn" },
      ] as NPC[]);
      const onChange = vi.fn();
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.prop}
          values={{ kind: "npc", npc_id: 2, hidden: false, locked: false, trapped: false }}
          onChange={onChange}
        />,
      );

      const select = (await screen.findByLabelText("NPC")) as HTMLSelectElement;
      expect(select.value).toBe("2");
      expect(select).not.toBeDisabled();
      expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
        "No NPC",
        "Arendelle",
        "Bjorn",
      ]);

      fireEvent.change(select, { target: { value: "1" } });
      expect(onChange).toHaveBeenCalledWith("npc_id", 1);

      fireEvent.change(select, { target: { value: "" } });
      expect(onChange).toHaveBeenCalledWith("npc_id", null);
    });
  });

  describe("DestinationPickerField (stair/portal)", () => {
    const layout: MapLayout = {
      meta: { cellSizeFt: 5, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      rooms: [
        {
          room_id: 1,
          z: 0,
          origin: [0, 0],
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
        { room_id: 2, z: 1, origin: [0, 0], cells: [[3, 3]] },
      ],
      doors: [],
      stairs: [],
      floors: [
        { z: 0, title: "Ground Floor" },
        { z: 1, title: "First Floor" },
      ],
      props: [],
      portals: [],
      features: [],
    };

    it("renders a floor select and a room select populated from the layout", () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{
            title: "",
            to: { z: 0, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={vi.fn()}
          layout={layout}
        />,
      );
      const floorSelect = screen.getByLabelText("Floor") as HTMLSelectElement;
      expect(floorSelect.value).toBe("0");
      expect(floorSelect).not.toBeDisabled();
      expect(Array.from(floorSelect.options).map((o) => o.textContent)).toEqual([
        "Ground Floor",
        "First Floor",
      ]);

      const roomSelect = screen.getByLabelText("Room") as HTMLSelectElement;
      expect(roomSelect.value).toBe("1");
      expect(roomSelect).not.toBeDisabled();
      expect(Array.from(roomSelect.options).map((o) => o.textContent)).toEqual([
        "Select a room…",
        "Room 1",
      ]);
    });

    it("switching the floor swaps which floor's rooms are offered", () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{
            title: "",
            to: { z: 0, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={vi.fn()}
          layout={layout}
        />,
      );
      expect(
        Array.from((screen.getByLabelText("Room") as HTMLSelectElement).options).map(
          (o) => o.textContent,
        ),
      ).toEqual(["Select a room…", "Room 1"]);

      const floorSelect = screen.getByLabelText("Floor") as HTMLSelectElement;
      fireEvent.change(floorSelect, { target: { value: "1" } });
      expect(
        Array.from((screen.getByLabelText("Room") as HTMLSelectElement).options).map(
          (o) => o.textContent,
        ),
      ).toEqual(["Select a room…", "Room 2"]);
    });

    it("selecting a room sets the destination to a free cell inside that room", () => {
      const onChange = vi.fn();
      vi.spyOn(Math, "random").mockReturnValue(0);
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{
            title: "",
            to: { z: 0, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={onChange}
          layout={layout}
        />,
      );
      fireEvent.change(screen.getByLabelText("Room"), { target: { value: "1" } });
      expect(onChange).toHaveBeenCalledWith("to", { z: 0, cell: [0, 0] });
      vi.restoreAllMocks();
    });

    it("renders nothing when no layout is supplied", () => {
      const { container } = render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{
            title: "",
            to: { z: 0, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={vi.fn()}
        />,
      );
      expect(container.querySelector("select#maplab-field-to")).toBeNull();
    });

    it("keeps the live gateway picker selection and maps a chosen dungeon object", async () => {
      vi.spyOn(api, "listDungeons").mockResolvedValue([
        { id: 4, title: "Current Dungeon", data: {} },
        { id: 9, title: "Far Dungeon", data: {} },
        { id: 10, title: "Near Dungeon", data: {} },
      ] as Dungeon[]);
      const onChange = vi.fn();
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{
            title: "",
            to: { dungeon_id: 9 },
            hidden: false,
            locked: false,
            trapped: false,
          }}
          onChange={onChange}
          layout={layout}
          currentDungeonId={4}
        />,
      );

      const select = (await screen.findByLabelText("Dungeon")) as HTMLSelectElement;
      expect(select.value).toBe("9");
      expect(select).not.toBeDisabled();
      expect(
        Array.from(select.options).map((option) => [option.value, option.textContent]),
      ).toEqual([
        ["", "Select a dungeon…"],
        ["9", "Far Dungeon"],
        ["10", "Near Dungeon"],
      ]);

      fireEvent.change(select, { target: { value: "10" } });
      expect(onChange).toHaveBeenCalledWith("to", { dungeon_id: 10 });
    });
  });
});

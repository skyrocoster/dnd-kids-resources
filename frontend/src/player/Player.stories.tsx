import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createEmptyMapLayout } from "../model/maplabModel";
import { FloorPicker } from "./FloorPicker";
import { PlayerMapRenderer } from "./PlayerMapRenderer";
import { PlayerHome, PlayerMapRoute, PlayerShell } from "./PlayerShell";
import { PlayerSpellbookRoute } from "./PlayerSpellbookRoute";
import { playerViewTransform } from "./curtain";

const meta = {
  title: "Production/Application/Player View",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function sampleMap() {
  const layout = createEmptyMapLayout("Old Library");
  layout.rooms.push({
    room_id: 1,
    z: 0,
    origin: [1, 1],
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    title: "Library",
  });
  layout.doors.push({
    door_id: 1,
    cell: [1, 1],
    side: "N",
    z: 0,
    hidden: false,
    locked: false,
    trapped: false,
  });
  layout.props.push({
    prop_id: 1,
    kind: "chest",
    cell: [2, 2],
    z: 0,
    hidden: false,
    locked: false,
    trapped: false,
  });
  return layout;
}

export const PlayerHomeMenu: Story = {
  name: "Player home — map and spellbook destinations",
  render: () => (
    <MemoryRouter initialEntries={["/play"]}>
      <Routes>
        <Route element={<PlayerShell />}>
          <Route index element={<PlayerHome />} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
};

export const PlayerMapCanvas: Story = {
  name: "Map renderer — room, door, and fixture",
  render: () => (
    <div style={{ minHeight: "80vh" }}>
      <PlayerMapRenderer layout={playerViewTransform(sampleMap())} />
    </div>
  ),
};

export const FloorPickerOptions: Story = {
  name: "Floor picker — three levels",
  render: () => (
    <FloorPicker
      floors={[{ z: -1, title: "Basement" }, { z: 0, title: "Ground" }, { z: 1, title: "Tower" }]}
      selectedZ={0}
      onSelectFloor={() => {}}
    />
  ),
};

export const PlayerMapEmptyRoute: Story = {
  name: "Player map route — no shared map",
  render: () => (
    <MemoryRouter initialEntries={["/play/map"]}>
      <Routes>
        <Route element={<PlayerShell />}>
          <Route path="/play/map" element={<PlayerMapRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
};

export const PlayerSpellbookRouteView: Story = {
  name: "Spellbook route — assigned spell status",
  render: () => (
    <MemoryRouter initialEntries={["/play/spells"]}>
      <Routes>
        <Route element={<PlayerShell />}>
          <Route path="/play/spells" element={<PlayerSpellbookRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
};

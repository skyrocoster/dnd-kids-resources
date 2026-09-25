import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DungeonShell } from "./DungeonShell";
import { MapLabEditorPage } from "./MapLabEditorPage";
import { MapLabPage } from "./MapLabPage";
import { MapLabRouteState } from "./MapLabRouteState";

const meta = {
  title: "In Development/Application/Map Lab",
  tags: ["status-in-development"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function MapLabRoute({ editor = false }: { editor?: boolean }) {
  return (
    <MemoryRouter initialEntries={[editor ? "/dungeons/1/edit" : "/dungeons/1"]}>
      <Routes>
        <Route path="/dungeons/:dungeonId" element={<DungeonShell />}>
          <Route index element={<MapLabPage />} />
          <Route path="edit" element={<MapLabEditorPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export const DungeonMapViewer: Story = {
  name: "Dungeon shell — read-only map view",
  render: () => <MapLabRoute />,
};

export const DungeonMapEditor: Story = {
  name: "Map Lab editor — authored room and fixture",
  render: () => <MapLabRoute editor />,
};

export const LoadingRouteState: Story = {
  name: "Route state — loading dungeon",
  render: () => (
    <MapLabRouteState title="Loading dungeon" message="Loading dungeon details…" variant="loading" />
  ),
};

export const MissingRouteState: Story = {
  name: "Route state — dungeon missing",
  render: () => <MapLabRouteState title="Dungeon missing" message="This dungeon does not exist." variant="error" />,
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { storyViewport } from "../storybook/viewports";
import { AppShell } from "./AppShell";
import { HomePage } from "../pages/HomePage";

const meta = {
  title: "Production/Application/Shell and Pages",
  tags: ["status-production"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AppShellWithFieldGuide: Story = {
  name: "App shell — Field Guide home",
  parameters: storyViewport("desktop-1280"),
  render: () => (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
};

export const AppShellPhoneNavigation: Story = {
  name: "App shell — phone navigation",
  parameters: storyViewport("phone-390"),
  render: () => (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
};

export const FieldGuideAlone: Story = {
  name: "Field Guide — chapter navigation",
  render: () => <MemoryRouter><HomePage /></MemoryRouter>,
};

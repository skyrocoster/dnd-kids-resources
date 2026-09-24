import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";

function lazyComponent(load: () => Promise<Record<string, unknown>>, exportName: string) {
  return async () => ({
    Component: (await load())[exportName] as ComponentType,
  });
}

export const routes = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        lazy: lazyComponent(() => import("./pages/HomePage"), "HomePage"),
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: "demo",
              lazy: lazyComponent(() => import("./pages/ComponentDemoPage"), "ComponentDemoPage"),
            },
          ]
        : []),
      {
        path: "spells",
        lazy: lazyComponent(() => import("./features/spells/SpellBrowserPage"), "SpellBrowserPage"),
      },
      {
        path: "monsters",
        lazy: lazyComponent(
          () => import("./features/monsters/MonsterBrowserPage"),
          "MonsterBrowserPage",
        ),
      },
      {
        path: "monsters/new",
        lazy: lazyComponent(() => import("./features/monsters/MonsterEditor"), "MonsterEditor"),
      },
      {
        path: "monsters/:id/edit",
        lazy: lazyComponent(() => import("./features/monsters/MonsterEditor"), "MonsterEditor"),
      },
      {
        path: "weapons",
        lazy: lazyComponent(
          () => import("./features/weapons/WeaponBrowserPage"),
          "WeaponBrowserPage",
        ),
      },
      {
        path: "items",
        lazy: lazyComponent(() => import("./features/items/ItemBrowserPage"), "ItemBrowserPage"),
      },
      {
        path: "loot",
        lazy: lazyComponent(
          () => import("./features/loot/LootBundleBrowserPage"),
          "LootBundleBrowserPage",
        ),
      },
      {
        path: "players",
        lazy: lazyComponent(
          () => import("./features/players/PlayerBrowserPage"),
          "PlayerBrowserPage",
        ),
      },
      {
        path: "npcs",
        lazy: lazyComponent(() => import("./features/npcs/NPCBrowserPage"), "NPCBrowserPage"),
      },
      {
        path: "loom",
        lazy: lazyComponent(() => import("./features/loom/LoomPage"), "LoomPage"),
      },
      {
        path: "encounters",
        lazy: lazyComponent(
          () => import("./features/encounters/EncounterBrowserPage"),
          "EncounterBrowserPage",
        ),
      },
      {
        path: "encounters/:id/run",
        lazy: lazyComponent(
          () => import("./features/encounters/EncounterRunnerPage"),
          "EncounterRunnerPage",
        ),
      },
      {
        path: "dungeons",
        lazy: lazyComponent(
          () => import("./features/dungeons/DungeonBrowserPage"),
          "DungeonBrowserPage",
        ),
      },
      {
        path: "dungeons/:dungeonId",
        lazy: lazyComponent(
          () => import("./features/dungeons/maplab/DungeonShell"),
          "DungeonShell",
        ),
        children: [
          {
            index: true,
            lazy: lazyComponent(
              () => import("./features/dungeons/maplab/MapLabPage"),
              "MapLabPage",
            ),
          },
          {
            path: "edit",
            lazy: lazyComponent(
              () => import("./features/dungeons/maplab/MapLabEditorPage"),
              "MapLabEditorPage",
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/play",
    lazy: lazyComponent(() => import("./player/PlayerShell"), "PlayerShell"),
    children: [
      {
        index: true,
        lazy: lazyComponent(() => import("./player/PlayerShell"), "PlayerHome"),
      },
      {
        path: "map",
        lazy: lazyComponent(() => import("./player/PlayerShell"), "PlayerMapRoute"),
      },
      {
        path: "spells",
        lazy: lazyComponent(() => import("./player/PlayerSpellbookRoute"), "PlayerSpellbookRoute"),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

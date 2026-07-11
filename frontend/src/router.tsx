import { createBrowserRouter } from 'react-router-dom'
import { DungeonBrowserPage } from './features/dungeons/DungeonBrowserPage'
import { DungeonViewPage } from './features/dungeons/DungeonViewPage'
import { EncounterBrowserPage } from './features/encounters/EncounterBrowserPage'
import { MonsterBrowserPage } from './features/monsters/MonsterBrowserPage'
import { NPCBrowserPage } from './features/npcs/NPCBrowserPage'
import { PlayerBrowserPage } from './features/players/PlayerBrowserPage'
import { QuestBrowserPage } from './features/quests/QuestBrowserPage'
import { SpellBrowserPage } from './features/spells/SpellBrowserPage'
import { WeaponBrowserPage } from './features/weapons/WeaponBrowserPage'
import { AppShell } from './layout/AppShell'
import { ComponentDemoPage } from './pages/ComponentDemoPage'
import { HomePage } from './pages/HomePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'demo', element: <ComponentDemoPage /> },
      { path: 'spells', element: <SpellBrowserPage /> },
      { path: 'monsters', element: <MonsterBrowserPage /> },
      { path: 'weapons', element: <WeaponBrowserPage /> },
      { path: 'players', element: <PlayerBrowserPage /> },
      { path: 'npcs', element: <NPCBrowserPage /> },
      { path: 'quests', element: <QuestBrowserPage /> },
      { path: 'encounters', element: <EncounterBrowserPage /> },
      { path: 'dungeons', element: <DungeonBrowserPage /> },
      { path: 'dungeons/:dungeonId', element: <DungeonViewPage /> },
      { path: 'dungeons/:dungeonId/rooms/:roomId', element: <DungeonViewPage /> },
    ],
  },
])

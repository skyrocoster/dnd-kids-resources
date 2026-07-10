import { createBrowserRouter } from 'react-router-dom'
import { MonsterBrowserPage } from './features/monsters/MonsterBrowserPage'
import { SpellBrowserPage } from './features/spells/SpellBrowserPage'
import { WeaponBrowserPage } from './features/weapons/WeaponBrowserPage'
import { AppShell } from './layout/AppShell'
import { ComponentDemoPage } from './pages/ComponentDemoPage'
import { HomePage } from './pages/HomePage'
import { StubPage } from './pages/StubPage'

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
      { path: 'players', element: <StubPage title="Players" /> },
      { path: 'npcs', element: <StubPage title="NPCs" /> },
      { path: 'quests', element: <StubPage title="Quests" /> },
      { path: 'encounters', element: <StubPage title="Encounters" /> },
      { path: 'dungeons', element: <StubPage title="Dungeons" /> },
    ],
  },
])

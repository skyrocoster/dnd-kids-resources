import { createBrowserRouter } from 'react-router-dom'
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
      { path: 'spells', element: <StubPage title="Spells" /> },
      { path: 'monsters', element: <StubPage title="Monsters" /> },
      { path: 'weapons', element: <StubPage title="Weapons" /> },
      { path: 'players', element: <StubPage title="Players" /> },
      { path: 'npcs', element: <StubPage title="NPCs" /> },
      { path: 'quests', element: <StubPage title="Quests" /> },
      { path: 'encounters', element: <StubPage title="Encounters" /> },
      { path: 'dungeons', element: <StubPage title="Dungeons" /> },
    ],
  },
])

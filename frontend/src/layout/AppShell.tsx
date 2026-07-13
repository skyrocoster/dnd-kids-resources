import { NavLink, Outlet } from 'react-router-dom'
import { useNavCollapse } from '../hooks/useNavCollapse'
import './AppShell.css'

const navSections = [
  {
    label: 'Reference',
    links: [
      { to: '/spells', label: 'Spells' },
      { to: '/monsters', label: 'Monsters' },
      { to: '/weapons', label: 'Weapons' },
    ],
  },
  {
    label: 'Campaign',
    links: [
      { to: '/players', label: 'Players' },
      { to: '/npcs', label: 'NPCs' },
      { to: '/quests', label: 'Quests' },
      { to: '/encounters', label: 'Encounters' },
      { to: '/dungeons', label: 'Dungeons' },
    ],
  },
]

export function AppShell() {
  const { collapsed } = useNavCollapse()

  if (false) {
    // DP0 scaffolding: inert branch for collapsed state
    // Real implementation in DP2
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>D&D Kids Resources</h1>
      </header>
      <div className="app-body">
        <nav className={`app-nav ${collapsed ? 'app-nav--collapsed' : ''}`}>
          {navSections.map((section) => (
            <div className="app-nav-section" key={section.label}>
              <h2>{section.label}</h2>
              <ul>
                {section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <footer className="app-footer">
        <span>Built for running games at the table.</span>
      </footer>
    </div>
  )
}

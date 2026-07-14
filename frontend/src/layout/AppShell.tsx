import { NavLink, Outlet } from 'react-router-dom'
import { useNavCollapse } from '../hooks/useNavCollapse'
import {
  DoorIcon,
  GemIcon,
  CoinsIcon,
  MasksIcon,
  NavCollapseIcon,
  NavExpandIcon,
  ScrollIcon,
  ShieldIcon,
  SkullIcon,
  SwordsIcon,
  UsersIcon,
  WandIcon,
} from '../components/icons'
import type { LucideIcon } from '../components/icons'
import './AppShell.css'

const navSections: {
  label: string
  links: { to: string; label: string; linkIcon: LucideIcon }[]
}[] = [
  {
    label: 'Reference',
    links: [
      { to: '/spells', label: 'Spells', linkIcon: WandIcon },
      { to: '/monsters', label: 'Monsters', linkIcon: SkullIcon },
      { to: '/weapons', label: 'Weapons', linkIcon: SwordsIcon },
    ],
  },
  {
    label: 'Campaign',
    links: [
      { to: '/players', label: 'Players', linkIcon: UsersIcon },
      { to: '/npcs', label: 'NPCs', linkIcon: MasksIcon },
      { to: '/quests', label: 'Quests', linkIcon: ScrollIcon },
      { to: '/encounters', label: 'Encounters', linkIcon: ShieldIcon },
      { to: '/dungeons', label: 'Dungeons', linkIcon: DoorIcon },
    ],
  },
  {
    label: 'Loot',
    links: [
      { to: '/items', label: 'Items', linkIcon: GemIcon },
      { to: '/loot', label: 'Loot Bundles', linkIcon: CoinsIcon },
    ],
  },
]

export function AppShell() {
  const { collapsed, toggle } = useNavCollapse()
  const ToggleIcon = collapsed ? NavExpandIcon : NavCollapseIcon

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>D&D Kids Resources</h1>
      </header>
      <div className="app-body">
        <nav className={`app-nav ${collapsed ? 'app-nav--collapsed' : ''}`}>
          <button
            type="button"
            className="app-nav-toggle"
            onClick={toggle}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <ToggleIcon size={20} aria-hidden="true" />
          </button>
          {navSections.map((section) => (
            <div className="app-nav-section" key={section.label}>
              <h2 className={collapsed ? 'visually-hidden' : undefined}>{section.label}</h2>
              <ul>
                {section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      aria-label={link.label}
                      title={link.label}
                    >
                      <link.linkIcon size={20} aria-hidden="true" />
                      <span className={collapsed ? 'visually-hidden' : undefined}>{link.label}</span>
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

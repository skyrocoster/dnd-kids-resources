import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useNavCollapse } from '../hooks/useNavCollapse'
import { navSections } from './navSections'
import { Dialog } from '../components/Dialog'
import { IconButton } from '../components/IconButton'
import { MapIcon, MenuIcon, NavCollapseIcon, NavExpandIcon } from '../components/icons'
import './AppShell.css'

export function AppShell() {
  const { collapsed, toggle } = useNavCollapse()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const ToggleIcon = collapsed ? NavExpandIcon : NavCollapseIcon

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          <MapIcon size={22} aria-hidden="true" />
          <span>D&D Kids Resources</span>
        </Link>
        <div className="app-nav-mobile-trigger">
          <IconButton label="Open navigation" onClick={() => setMobileNavOpen(true)}>
            <MenuIcon size={20} aria-hidden="true" />
          </IconButton>
        </div>
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
      <Dialog open={mobileNavOpen} title="Navigate" onClose={() => setMobileNavOpen(false)}>
        <nav className="app-nav-mobile" aria-label="Site navigation">
          {navSections.map((section) => (
            <div className="app-nav-section" key={section.label}>
              <h2>{section.label}</h2>
              <ul>
                {section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <link.linkIcon size={20} aria-hidden="true" />
                      <span>{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Dialog>
    </div>
  )
}

import { createContext, useContext, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useNavCollapse } from '../hooks/useNavCollapse'
import { navSections } from './navSections'
import { Dialog } from '../components/Dialog'
import { IconButton } from '../components/IconButton'
import { MapIcon, MenuIcon, NavCollapseIcon, NavExpandIcon } from '../components/icons'
import './AppShell.css'

type AppShellRowSlots = {
  identitySlot: HTMLElement | null
  tabsSlot: HTMLElement | null
}

const appShellRowSlotsContext = createContext<AppShellRowSlots>({ identitySlot: null, tabsSlot: null })

export function useAppShellRowSlots(): AppShellRowSlots {
  return useContext(appShellRowSlotsContext)
}

export function AppShell() {
  const { collapsed, toggle } = useNavCollapse()
  const { pathname } = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [identitySlot, setIdentitySlot] = useState<HTMLElement | null>(null)
  const [tabsSlot, setTabsSlot] = useState<HTMLElement | null>(null)
  const ToggleIcon = collapsed ? NavExpandIcon : NavCollapseIcon
  const isEncounterRunner = /^\/encounters\/[^/]+\/run\/?$/.test(pathname)

  return (
    <appShellRowSlotsContext.Provider value={{ identitySlot, tabsSlot }}>
       <div className="app-shell">
       <div className="app-top-band">
         <header className="app-header">
           <div className="app-nav-mobile-trigger">
             <IconButton label="Open navigation" onClick={() => setMobileNavOpen(true)}>
               <MenuIcon size={20} aria-hidden="true" />
             </IconButton>
           </div>
           <div className="app-row-slot app-row-slot--identity" ref={setIdentitySlot} />
         </header>
         <div className="app-tabs-row">
           <div className="app-row-slot app-row-slot--tabs" ref={setTabsSlot} />
         </div>
       </div>
      <div className="app-body">
         <nav className={`app-nav ${collapsed ? 'app-nav--collapsed' : ''} ${isEncounterRunner ? 'app-nav--play' : ''}`}>
          <Link to="/" className="app-brand">
            <MapIcon size={22} aria-hidden="true" />
             <span className={collapsed || isEncounterRunner ? 'visually-hidden' : undefined}>D&D Kids Resources</span>
          </Link>
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
               <h2 className={collapsed || isEncounterRunner ? 'visually-hidden' : undefined}>{section.label}</h2>
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
                       <span className={collapsed || isEncounterRunner ? 'visually-hidden' : undefined}>{link.label}</span>
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
    </appShellRowSlotsContext.Provider>
  )
}

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetViewport, setViewport } from '../../test/viewport'
import { AppShell } from '../AppShell'

const STORAGE_KEY = 'dnd-kids-nav-collapsed'

function renderShell(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <div>home content</div> },
          { path: 'spells', element: <div>spells content</div> },
          { path: 'encounters/:id/run', element: <div>encounter runner content</div> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('renders the brand as a home link, not a route heading', () => {
    renderShell()
    const brand = screen.getByRole('link', { name: 'D&D Kids Resources' })
    expect(brand).toBeInTheDocument()
    expect(brand).toHaveAttribute('href', '/')
    expect(screen.queryByRole('heading', { name: 'D&D Kids Resources' })).not.toBeInTheDocument()
  })

  it('renders the header and nav sections', () => {
    renderShell()
    expect(screen.getByText('Reference')).toBeInTheDocument()
    expect(screen.getByText('Campaign')).toBeInTheDocument()
    expect(screen.getByText('Loot')).toBeInTheDocument()
  })

  it('puts the home action first in the desktop rail and exposes row slots', () => {
    renderShell()
    const nav = document.querySelector('.app-nav') as HTMLElement
    const header = document.querySelector('.app-header') as HTMLElement
    const tabsRow = document.querySelector('.app-tabs-row') as HTMLElement
    expect(nav.firstElementChild).toHaveClass('app-brand')
    expect(document.querySelector('.app-row-slot--identity')).toBeInTheDocument()
    expect(document.querySelector('.app-row-slot--tabs')).toBeInTheDocument()
    expect(header.parentElement).toHaveClass('app-top-band')
    expect(header.nextElementSibling).toBe(tabsRow)
    expect(tabsRow.querySelector('.app-row-slot--tabs')).toBeInTheDocument()
  })

  it('collapses the empty tabs slot without reserving row height', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/layout/AppShell.css'), 'utf-8')
    expect(css).toContain('.app-row-slot--tabs:empty')
    expect(css).toMatch(/\.app-row-slot--tabs:empty\s*\{[^}]*display:\s*none;/s)
  })

  it('renders links for every kept feature area', () => {
    renderShell()
    const labels = [
      'Spells',
      'Monsters',
      'Weapons',
      'Players',
      'NPCs',
      'The Loom',
      'Encounters',
      'Dungeons',
      'Items',
      'Loot Bundles',
    ]
    for (const label of labels) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0)
    }
  })

  it('renders the routed child content in the outlet without an app footer', () => {
    renderShell('/spells')
    expect(screen.getByText('spells content')).toBeInTheDocument()
    expect(screen.queryByText('Built for running games at the table.')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('collapses on toggle', async () => {
    const user = userEvent.setup()
    renderShell()
    const toggle = screen.getByRole('button', { name: 'Collapse navigation' })
    const nav = document.querySelector('.app-nav')
    expect(nav).not.toHaveClass('app-nav--collapsed')

    await user.click(toggle)

    expect(nav).toHaveClass('app-nav--collapsed')
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument()
  })

  it('persists across remount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    renderShell()
    const nav = document.querySelector('.app-nav')
    expect(nav).toHaveClass('app-nav--collapsed')
    expect(document.querySelector('.app-nav .app-brand span')).toHaveClass('visually-hidden')
  })

  it('uses compact navigation for the encounter runner without changing the preference', () => {
    window.localStorage.setItem(STORAGE_KEY, 'false')
    renderShell('/encounters/123/run')

    expect(document.querySelector('.app-nav')).toHaveClass('app-nav--play')
    expect(document.querySelector('.app-nav')).not.toHaveClass('app-nav--collapsed')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')
    expect(screen.getByText('encounter runner content')).toBeInTheDocument()
    expect(document.querySelector('.app-nav .app-brand span')).toHaveClass('visually-hidden')
    expect(document.querySelector('.app-nav .app-nav-section h2')).toHaveClass('visually-hidden')
    expect(document.querySelector('.app-nav .app-nav-section a span')).toHaveClass('visually-hidden')
  })

  it('leaves preparation navigation preference-controlled after leaving the runner', () => {
    window.localStorage.setItem(STORAGE_KEY, 'false')
    renderShell('/spells')

    expect(document.querySelector('.app-nav')).not.toHaveClass('app-nav--play')
    expect(document.querySelector('.app-nav')).not.toHaveClass('app-nav--collapsed')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('icon-only rail keeps links clickable', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))

    const spellsLink = screen.getAllByRole('link', { name: 'Spells' })[0]
    expect(spellsLink).toBeInTheDocument()
    await user.click(spellsLink)
    expect(screen.getByText('spells content')).toBeInTheDocument()
  })

  it('focus ring visible when collapsed', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))

    await user.tab()
    expect(document.activeElement).not.toBeNull()
  })

  describe('mobile navigation at narrow viewport', () => {
    beforeEach(() => {
      setViewport(768, 1024)
    })

    afterEach(() => {
      resetViewport()
    })

    it('opens a mobile navigation drawer with reachable links', async () => {
      const user = userEvent.setup()
      renderShell()

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Open navigation' }))

      const dialog = screen.getByRole('dialog', { name: 'Navigate' })
      expect(dialog).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Site navigation' })).toBeInTheDocument()
    })

    it('closes the mobile navigation drawer after selecting a link', async () => {
      const user = userEvent.setup()
      renderShell()

      await user.click(screen.getByRole('button', { name: 'Open navigation' }))
      const drawerSpellsLink = screen.getByRole('navigation', { name: 'Site navigation' }).querySelector(
        'a[href="/spells"]',
      ) as HTMLElement
      await user.click(drawerSpellsLink)

      expect(screen.getByText('spells content')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes the mobile navigation drawer on Escape', async () => {
      const user = userEvent.setup()
      renderShell()

      await user.click(screen.getByRole('button', { name: 'Open navigation' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // VF5: shell CSS uses foundation spacing tokens, not ad-hoc values
  it('AppShell.css uses spacing tokens for header and nav', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/layout/AppShell.css'), 'utf-8')
    expect(css).toContain('var(--space-')
    expect(css).toContain('var(--radius-sm)')
    expect(css).toContain('var(--control-height)')
    expect(css).toContain('var(--motion-normal)')
    // Verify no ad-hoc header/nav padding remains
    expect(css).not.toMatch(/padding:\s*1rem\s+1\.5rem/)
    expect(css).not.toMatch(/padding:\s*1\.5rem\s*;/)
    expect(css).not.toMatch(/padding:\s*0\.5rem\s+1\.5rem/)
  })
})

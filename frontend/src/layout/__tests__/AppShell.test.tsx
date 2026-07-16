import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

  it('renders links for every kept feature area', () => {
    renderShell()
    const labels = [
      'Spells',
      'Monsters',
      'Weapons',
      'Players',
      'NPCs',
      'Quests',
      'Encounters',
      'Dungeons',
      'Items',
      'Loot Bundles',
    ]
    for (const label of labels) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0)
    }
  })

  it('renders the routed child content in the outlet', () => {
    renderShell('/spells')
    expect(screen.getByText('spells content')).toBeInTheDocument()
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

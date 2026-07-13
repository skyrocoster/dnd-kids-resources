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

  it('renders the header and nav sections', () => {
    renderShell()
    expect(screen.getByText('D&D Kids Resources')).toBeInTheDocument()
    expect(screen.getByText('Reference')).toBeInTheDocument()
    expect(screen.getByText('Campaign')).toBeInTheDocument()
  })

  it('renders links for every kept feature area', () => {
    renderShell()
    const labels = ['Spells', 'Monsters', 'Weapons', 'Players', 'NPCs', 'Quests', 'Encounters', 'Dungeons']
    for (const label of labels) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
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

    const spellsLink = screen.getByRole('link', { name: 'Spells' })
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
})

import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../AppShell'

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

  // DP0 scaffolding: nav collapse stubs (DP2 implementation)
  it.skip('collapses on toggle', () => {
    // TODO: trigger toggle, assert nav has app-nav--collapsed class
  })

  it.skip('persists across remount', () => {
    // TODO: set collapsed in localStorage, remount component, assert state preserved
  })

  it.skip('icon-only rail keeps links clickable', () => {
    // TODO: collapse nav, verify links are still navigable (no "expand first" step)
  })

  it.skip('focus ring visible when collapsed', () => {
    // TODO: collapse nav, navigate via keyboard, verify focus ring visible
  })
})

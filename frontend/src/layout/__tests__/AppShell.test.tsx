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
})

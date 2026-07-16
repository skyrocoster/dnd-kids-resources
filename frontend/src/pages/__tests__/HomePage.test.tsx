import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from '../HomePage'

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('renders one route heading', () => {
    renderHomePage()
    expect(screen.getByRole('heading', { level: 1, name: 'Field Guide' })).toBeInTheDocument()
  })

  it('renders a chapter tab for every nav section', () => {
    renderHomePage()
    expect(screen.getByRole('tab', { name: 'Reference' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Campaign' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Loot' })).toBeInTheDocument()
  })

  it('shows the Reference chapter links by default', () => {
    renderHomePage()
    expect(screen.getByRole('link', { name: 'Spells' })).toHaveAttribute('href', '/spells')
    expect(screen.getByRole('link', { name: 'Monsters' })).toHaveAttribute('href', '/monsters')
    expect(screen.getByRole('link', { name: 'Weapons' })).toHaveAttribute('href', '/weapons')
  })

  it('switches chapters when a tab is selected', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await user.click(screen.getByRole('tab', { name: 'Loot' }))

    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute('href', '/items')
    expect(screen.getByRole('link', { name: 'Loot Bundles' })).toHaveAttribute('href', '/loot')
    expect(screen.queryByRole('link', { name: 'Spells' })).not.toBeInTheDocument()
  })
})

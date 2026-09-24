import { render, screen, within } from '@testing-library/react'
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
    const tab = screen.getByRole('tab', { name: 'Reference' })
    const panel = screen.getByRole('tabpanel', { name: 'Reference' })

    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    expect(within(panel).getByRole('link', { name: 'Spells' })).toHaveAttribute('href', '/spells')
    expect(within(panel).getByRole('link', { name: 'Monsters' })).toHaveAttribute('href', '/monsters')
    expect(within(panel).getByRole('link', { name: 'Weapons' })).toHaveAttribute('href', '/weapons')
  })

  it('switches chapters when a tab is selected', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await user.click(screen.getByRole('tab', { name: 'Loot' }))

    const tab = screen.getByRole('tab', { name: 'Loot' })
    const panel = screen.getByRole('tabpanel', { name: 'Loot' })

    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    expect(within(panel).getByRole('link', { name: 'Items' })).toHaveAttribute('href', '/items')
    expect(within(panel).getByRole('link', { name: 'Loot Bundles' })).toHaveAttribute('href', '/loot')
    expect(screen.queryByRole('link', { name: 'Spells' })).not.toBeInTheDocument()
  })

  it('selects the next chapter and shows its links with the keyboard', async () => {
    const user = userEvent.setup()
    renderHomePage()

    screen.getByRole('tab', { name: 'Reference' }).focus()
    await user.keyboard('{ArrowRight}')

    const tab = screen.getByRole('tab', { name: 'Campaign' })
    const panel = screen.getByRole('tabpanel', { name: 'Campaign' })
    expect(tab).toHaveFocus()
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
    expect(within(panel).getByRole('link', { name: 'Players' })).toHaveAttribute('href', '/players')
    expect(screen.queryByRole('link', { name: 'Spells' })).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Disclosure } from '../Disclosure'
import { NavigationMenu } from '../NavigationMenu'
import { Tabs } from '../Tabs'

describe('navigation primitives', () => {
  it('opens and closes a disclosure', async () => {
    const user = userEvent.setup()
    render(
      <Disclosure summary="More details">
        <p>Extra information</p>
      </Disclosure>,
    )

    const trigger = screen.getByRole('button', { name: 'More details' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Extra information')).toBeVisible()
  })

  it('renders direct and grouped navigation links', () => {
    render(
      <NavigationMenu
        aria-label="Main navigation"
        defaultValue="library"
        items={[
          {
            id: 'library',
            label: 'Library',
            links: [{ id: 'spells', label: 'Spells', href: '/spells' }],
          },
          { id: 'players', label: 'Players', href: '/players' },
        ]}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Players' })).toHaveAttribute('href', '/players')
    expect(screen.getByRole('link', { name: 'Spells' })).toHaveAttribute('href', '/spells')
  })

  it('switches tab panels and reports controlled selection changes', async () => {
    const user = userEvent.setup()
    const onSelectedIdChange = vi.fn()
    const tabs = [
      { id: 'overview', label: 'Overview', content: 'Overview details' },
      { id: 'spells', label: 'Spells', content: 'Spell details' },
    ]
    const { rerender } = render(
      <Tabs ariaLabel="Character sections" onSelectedIdChange={onSelectedIdChange} selectedId="overview" tabs={tabs} />,
    )

    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toHaveTextContent('Overview details')
    await user.click(screen.getByRole('tab', { name: 'Spells' }))
    expect(onSelectedIdChange).toHaveBeenCalledWith('spells')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

    rerender(
      <Tabs ariaLabel="Character sections" onSelectedIdChange={onSelectedIdChange} selectedId="spells" tabs={tabs} />,
    )
    expect(screen.getByRole('tabpanel', { name: 'Spells' })).toHaveTextContent('Spell details')
  })

  it('selects the next associated tab panel with the keyboard', async () => {
    const user = userEvent.setup()
    const tabs = [
      { id: 'overview', label: 'Overview', content: 'Overview details' },
      { id: 'spells', label: 'Spells', content: 'Spell details' },
    ]
    render(<Tabs ariaLabel="Character sections" defaultSelectedId="overview" tabs={tabs} />)

    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    const overviewPanel = document.getElementById(overviewTab.getAttribute('aria-controls')!)
    expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    expect(overviewPanel).toHaveAttribute('aria-labelledby', overviewTab.id)
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toHaveTextContent('Overview details')

    await user.click(overviewTab)
    await user.keyboard('{ArrowRight}')

    const spellsTab = screen.getByRole('tab', { name: 'Spells' })
    expect(spellsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Spells' })).toHaveTextContent('Spell details')
    expect(document.getElementById(spellsTab.getAttribute('aria-controls')!)).toHaveAttribute(
      'aria-labelledby',
      spellsTab.id,
    )
  })
})

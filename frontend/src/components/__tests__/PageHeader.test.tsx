import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="Spells" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Spells' })).toBeInTheDocument()
  })

  it('renders an optional subtitle', () => {
    render(<PageHeader title="Monsters" subtitle="Bestiary browser" />)
    expect(screen.getByText('Bestiary browser')).toBeInTheDocument()
  })

  const tabs = [
    { key: 'rooms', label: 'Rooms', icon: <span aria-hidden="true">🚪</span> },
    { key: 'npcs', label: 'NPCs', icon: <span aria-hidden="true">🧙</span> },
  ]

  // VF1: chapter tabs render with icon and label
  it('renders chapter tabs with icon and label', () => {
    render(<PageHeader title="Dungeon" chapterTabs={tabs} />)
    expect(screen.getByRole('tab', { name: 'Rooms' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'NPCs' })).toBeInTheDocument()
  })

  // VF1: active tab receives aria-selected and active class
  it('marks the active tab with aria-selected=true', () => {
    render(<PageHeader title="Dungeon" chapterTabs={tabs} activeTab="npcs" />)
    expect(screen.getByRole('tab', { name: 'Rooms' })).toHaveAttribute('aria-selected', 'false')
    const activeTab = screen.getByRole('tab', { name: 'NPCs' })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')
    expect(activeTab).toHaveClass('page-header-tab--active')
  })

  // VF1: tab click calls onTabSelect with the tab key
  it('calls onTabSelect when a tab is clicked', async () => {
    const user = userEvent.setup()
    const onTabSelect = vi.fn()
    render(<PageHeader title="Dungeon" chapterTabs={tabs} onTabSelect={onTabSelect} />)
    await user.click(screen.getByRole('tab', { name: 'Rooms' }))
    expect(onTabSelect).toHaveBeenCalledWith('rooms')
  })

  // VF1: actions slot renders alongside the title
  it('renders actions in the actions slot', () => {
    render(<PageHeader title="Dungeon" actions={<button type="button">Edit</button>} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchList } from '../SearchList'

interface Item {
  id: number
  name: string
  level: string
}

const items: Item[] = [
  { id: 1, name: 'Fireball', level: '3rd' },
  { id: 2, name: 'Magic Missile', level: '1st' },
  { id: 3, name: 'Frost Ray', level: '2nd' },
]

describe('SearchList', () => {
  it('renders all items with their meta', () => {
    render(
      <SearchList
        items={items}
        getId={(i) => i.id}
        getLabel={(i) => i.name}
        getMeta={(i) => i.level}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('3rd')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('filters items by search query', async () => {
    const user = userEvent.setup()
    render(<SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={() => {}} />)
    await user.type(screen.getByPlaceholderText('Search…'), 'fire')
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument()
  })

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup()
    render(<SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={() => {}} emptyMessage="Nothing found." />)
    await user.type(screen.getByPlaceholderText('Search…'), 'zzz')
    expect(screen.getByText('Nothing found.')).toBeInTheDocument()
  })

  it('calls onSelect with the clicked item', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={onSelect} />)
    await user.click(screen.getByText('Frost Ray'))
    expect(onSelect).toHaveBeenCalledWith(items[2])
  })

  it('marks the selected item as active', () => {
    render(<SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={() => {}} selectedId={2} />)
    expect(screen.getByRole('option', { name: /Magic Missile/ })).toHaveAttribute('aria-selected', 'true')
  })
})

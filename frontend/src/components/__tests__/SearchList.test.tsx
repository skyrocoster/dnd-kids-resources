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
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
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
    render(
      <SearchList
        items={items}
        getId={(i) => i.id}
        getLabel={(i) => i.name}
        onSelect={() => {}}
        emptyMessage="Nothing found."
      />,
    )
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
    render(
      <SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={() => {}} selectedId={2} />,
    )
    expect(screen.getByRole('button', { name: /Magic Missile/ })).toHaveAttribute('aria-current', 'true')
  })

  // VF2: a genuinely empty collection is distinguishable from a filtered-empty result
  it('shows a distinct empty-collection state when there are no items at all', () => {
    render(<SearchList items={[]} getId={(i: Item) => i.id} getLabel={(i: Item) => i.name} onSelect={() => {}} />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('shows the filtered-empty state with distinct default copy when a query matches nothing', async () => {
    const user = userEvent.setup()
    render(<SearchList items={items} getId={(i) => i.id} getLabel={(i) => i.name} onSelect={() => {}} />)
    await user.type(screen.getByPlaceholderText('Search…'), 'zzz')
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  // VF2: loading and error states render through the shared StatePanel contract
  it('shows a loading state via the status prop', () => {
    render(
      <SearchList
        items={[]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSelect={() => {}}
        status="loading"
      />,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state via the status prop', () => {
    render(
      <SearchList
        items={[]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSelect={() => {}}
        status="error"
      />,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  // VF2: search target classes meet the 48px touch-target floor
  it('search input and item rows consume the control-height token', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/SearchList.css'), 'utf-8')
    expect(css).toMatch(/\.search-list-input\s*\{[^}]*min-height:\s*var\(--control-height\)/)
    expect(css).toMatch(/\.search-list-item\s*\{[^}]*min-height:\s*var\(--control-height\)/)
  })
})

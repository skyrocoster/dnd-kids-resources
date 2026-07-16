import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatePanel } from '../StatePanel'

describe('StatePanel', () => {
  it('renders loading state with default copy', () => {
    render(<StatePanel status="loading" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders empty state with default copy', () => {
    render(<StatePanel status="empty" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders error state with default copy', () => {
    render(<StatePanel status="error" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('accepts custom title and message', () => {
    render(<StatePanel status="empty" title="No spells" message="Add a spell first." />)
    expect(screen.getByText('No spells')).toBeInTheDocument()
    expect(screen.getByText('Add a spell first.')).toBeInTheDocument()
  })

  // VF2: loading state shows a spinner or visual indicator
  it('renders a visual loading indicator for loading status', () => {
    const { container } = render(<StatePanel status="loading" />)
    expect(container.querySelector('.state-panel-spinner')).toBeInTheDocument()
  })

  it('does not render a loading indicator for non-loading statuses', () => {
    const { container } = render(<StatePanel status="empty" />)
    expect(container.querySelector('.state-panel-spinner')).not.toBeInTheDocument()
  })

  // VF2: filteredEmpty differs from empty in copy
  it('filteredEmpty uses distinct default copy from empty', () => {
    render(<StatePanel status="filteredEmpty" />)
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  // VF2: noSelection state has distinct copy
  it('noSelection uses distinct default copy', () => {
    render(<StatePanel status="noSelection" />)
    expect(screen.getByText('Select an item')).toBeInTheDocument()
  })

  // VF2: action slot renders an interactive element
  it('renders an action element in the action slot', () => {
    render(<StatePanel status="error" action={<button type="button">Retry</button>} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  // VF2: aria-live polite for dynamic status updates
  it('has aria-live=polite for screen reader announcements', () => {
    render(<StatePanel status="loading" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})

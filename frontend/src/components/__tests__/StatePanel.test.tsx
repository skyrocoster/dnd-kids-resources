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
  it.skip('renders a visual loading indicator for loading status', () => {})

  // VF2: filteredEmpty differs from empty in copy
  it.skip('filteredEmpty uses distinct default copy from empty', () => {})

  // VF2: noSelection state has distinct copy
  it.skip('noSelection uses distinct default copy', () => {})

  // VF2: action slot renders an interactive element
  it.skip('renders an action element in the action slot', () => {})

  // VF2: aria-live polite for dynamic status updates
  it.skip('has aria-live=polite for screen reader announcements', () => {})
})

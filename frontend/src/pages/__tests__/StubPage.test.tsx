import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StubPage } from '../StubPage'

describe('StubPage', () => {
  it('renders the given title and a not-built-yet notice', () => {
    render(<StubPage title="Monsters" />)
    expect(screen.getByRole('heading', { name: 'Monsters' })).toBeInTheDocument()
    expect(screen.getByText('Not built yet.')).toBeInTheDocument()
  })
})

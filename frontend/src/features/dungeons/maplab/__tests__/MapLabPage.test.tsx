import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapLabPage } from '../MapLabPage'

describe('MapLabPage (M0a scaffold)', () => {
  it('renders placeholder', () => {
    render(<MapLabPage />)
    expect(screen.getByText('Map Lab')).toBeInTheDocument()
    expect(screen.getByText('Programmatic dungeon map prototype')).toBeInTheDocument()
  })

  it.skip('renders SVG canvas with rooms - to be implemented in M1', () => {
    // SVG rendering tested in M1
  })

  it.skip('room selection works - to be implemented in M1', () => {
    // Interactivity tested in M1
  })

  it.skip('stairs switch active floor - to be implemented in M2', () => {
    // Z-axis navigation tested in M2
  })
})

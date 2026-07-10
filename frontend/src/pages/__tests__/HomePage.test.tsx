import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '../HomePage'
import * as client from '../../api/client'

describe('HomePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders abilities returned by the API', async () => {
    vi.spyOn(client, 'getAbilities').mockResolvedValue([
      { id: 1, code: 'str', name: 'Strength', description: null },
      { id: 2, code: 'dex', name: 'Dexterity', description: null },
    ])

    render(<HomePage />)

    expect(screen.getByText(/Loading abilities/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Strength')).toBeInTheDocument())
    expect(screen.getByText('Dexterity')).toBeInTheDocument()
  })

  it('shows an error message when the API call fails', async () => {
    vi.spyOn(client, 'getAbilities').mockRejectedValue(new Error('Bad Gateway'))

    render(<HomePage />)

    await waitFor(() => expect(screen.getByText(/API error: Bad Gateway/)).toBeInTheDocument())
  })
})

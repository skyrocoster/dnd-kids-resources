import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { LoomTapestry } from '../../../api/types'
import * as api from '../../../api/client'
import { LoomPage } from '../LoomPage'

function demoTapestry(): LoomTapestry {
  return {
    threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }],
    nodes: [
      { id: 1, kind: 'update', title: 'Puppy goes missing in the village', x: 0, y: 0, thread_ids: [1] },
      { id: 4, kind: 'anchor', title: 'Confront the goblin chief', status: 'planned', x: 400, y: 75, thread_ids: [1] },
      { id: 7, kind: 'update', title: 'Mysterious hooded stranger', x: 400, y: 300, thread_ids: [] },
    ],
    edges: [{ id: 1, source_id: 1, target_id: 4 }],
  }
}

describe('LoomPage', () => {
  it('renders the tapestry nodes and the vault panel once loaded', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument())
    expect(screen.getByText('Idea Vault (1)')).toBeInTheDocument()
  })

  it('shows an error state with a retry action on load failure', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockRejectedValue(new Error('network down'))

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

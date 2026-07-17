import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { LoomBridgeResult, LoomNode } from '../../../api/types'
import { LoomBridgeDialog } from '../LoomBridgeDialog'

const source: LoomNode = {
  id: 3,
  kind: 'update',
  title: 'Tracks lead to the goblin cave',
  x: 200,
  y: 75,
  thread_ids: [1, 2],
}

const anchor: LoomNode = {
  id: 4,
  kind: 'anchor',
  title: 'Confront the goblin chief',
  status: 'planned',
  x: 400,
  y: 75,
  thread_ids: [1, 2],
}

describe('LoomBridgeDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits the bridge payload and reports the splice result', async () => {
    const result: LoomBridgeResult = {
      node: { id: 8, kind: 'update', title: 'The chief is confronted', x: 300, y: 75, thread_ids: [1, 2] },
      created_edges: [
        { id: 10, source_id: 3, target_id: 8 },
        { id: 11, source_id: 8, target_id: 4 },
      ],
      deleted_edge_id: 5,
    }
    const createLoomBridge = vi.spyOn(api, 'createLoomBridge').mockResolvedValue(result)
    const onBridged = vi.fn()
    const user = userEvent.setup()

    render(<LoomBridgeDialog source={source} anchor={anchor} onClose={() => {}} onBridged={onBridged} />)

    expect(
      screen.getByRole('dialog', { name: 'Bridge "Tracks lead to the goblin cave" → "Confront the goblin chief"' }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), 'The chief is confronted')
    await user.type(screen.getByLabelText('Session tag'), 'Session 12')
    await user.click(screen.getByRole('button', { name: 'Create Bridge' }))

    await waitFor(() => expect(createLoomBridge).toHaveBeenCalledOnce())
    expect(createLoomBridge).toHaveBeenCalledWith({
      source_id: 3,
      anchor_id: 4,
      title: 'The chief is confronted',
      body: null,
      session_tag: 'Session 12',
    })
    expect(onBridged).toHaveBeenCalledWith(result)
  })

  it('shows a save error inline and does not call onBridged', async () => {
    vi.spyOn(api, 'createLoomBridge').mockRejectedValue(new Error('bridge would create a cycle'))
    const onBridged = vi.fn()
    const user = userEvent.setup()

    render(<LoomBridgeDialog source={source} anchor={anchor} onClose={() => {}} onBridged={onBridged} />)

    await user.type(screen.getByLabelText('Title'), 'Doomed bridge')
    await user.click(screen.getByRole('button', { name: 'Create Bridge' }))

    expect(await screen.findByRole('status')).toHaveTextContent('bridge would create a cycle')
    expect(onBridged).not.toHaveBeenCalled()
  })
})

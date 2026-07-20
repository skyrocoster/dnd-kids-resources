import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { LoomNode } from '../../../api/types'
import { LoomNodeEditor } from '../LoomNodeEditor'

describe('LoomNodeEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a session node', async () => {
    const created: LoomNode = { id: 8, kind: 'session', title: 'New note', thread_id: null, position: 0, carried_count: 0 }
    const createLoomNode = vi.spyOn(api, 'createLoomNode').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        onClose={() => {}}
        onSaved={onSaved}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add New Session' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'New note')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    await waitFor(() => expect(createLoomNode).toHaveBeenCalledOnce())
    expect(createLoomNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'session', title: 'New note' }),
    )
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('creates a beat node with the beat kind selected', async () => {
    const created: LoomNode = {
      id: 9,
      kind: 'beat',
      title: 'Confront the chief',
      thread_id: null,
      position: 0,
      carried_count: 0,
    }
    const createLoomNode = vi.spyOn(api, 'createLoomNode').mockResolvedValue(created)
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        initialKind="beat"
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add New Beat' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'Confront the chief')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    await waitFor(() => expect(createLoomNode).toHaveBeenCalledOnce())
    expect(createLoomNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'beat', title: 'Confront the chief' }),
    )
  })

  it('edits an existing node, locking kind', async () => {
    const node: LoomNode = {
      id: 3,
      kind: 'session',
      title: 'Tracks lead to the cave',
      thread_id: 1,
      session_id: 2,
      position: 10,
      carried_count: 0,
    }
    const updateLoomNode = vi.spyOn(api, 'updateLoomNode').mockResolvedValue(node)
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        node={node}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit Session: Tracks lead to the cave' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kind')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(updateLoomNode).toHaveBeenCalledWith(3, expect.objectContaining({ kind: 'session' })),
    )
  })

  it('shows a save error inline', async () => {
    vi.spyOn(api, 'createLoomNode').mockRejectedValue(new Error('Failed to create node'))
    const user = userEvent.setup()
    render(
      <LoomNodeEditor onClose={() => {}} onSaved={() => {}} />,
    )

    await user.type(screen.getByLabelText('Title'), 'Doomed note')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Failed to create node')
  })
})

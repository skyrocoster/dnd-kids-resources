import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { LoomNode, LoomThread } from '../../../api/types'
import { LoomNodeEditor } from '../LoomNodeEditor'

const threads: LoomThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Goblin Trouble', color: 'thread-1' },
]

describe('LoomNodeEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an update node with the default position and no status', async () => {
    const created: LoomNode = { id: 8, kind: 'update', title: 'New note', x: 10, y: 20, thread_ids: [] }
    const createLoomNode = vi.spyOn(api, 'createLoomNode').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        threads={threads}
        defaultPosition={{ x: 10, y: 20 }}
        onClose={() => {}}
        onSaved={onSaved}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add New Update' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'New note')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    await waitFor(() => expect(createLoomNode).toHaveBeenCalledOnce())
    expect(createLoomNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'update', title: 'New note', status: null, x: 10, y: 20, thread_ids: [] }),
    )
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('creates an anchor node with the selected status and threads', async () => {
    const created: LoomNode = {
      id: 9,
      kind: 'anchor',
      title: 'Confront the chief',
      status: 'planned',
      x: 0,
      y: 0,
      thread_ids: [2],
    }
    const createLoomNode = vi.spyOn(api, 'createLoomNode').mockResolvedValue(created)
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        initialKind="anchor"
        threads={threads}
        defaultPosition={{ x: 0, y: 0 }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add New Anchor' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'Confront the chief')
    await user.selectOptions(screen.getByLabelText('Status'), 'planned')
    await user.click(screen.getByRole('checkbox', { name: 'Goblin Trouble' }))
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    await waitFor(() => expect(createLoomNode).toHaveBeenCalledOnce())
    expect(createLoomNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'anchor', status: 'planned', thread_ids: [2] }),
    )
  })

  it('edits an existing node, preserving its stored position and locking kind', async () => {
    const node: LoomNode = {
      id: 3,
      kind: 'update',
      title: 'Tracks lead to the cave',
      x: 250,
      y: 60,
      thread_ids: [1, 2],
    }
    const updateLoomNode = vi.spyOn(api, 'updateLoomNode').mockResolvedValue(node)
    const user = userEvent.setup()
    render(
      <LoomNodeEditor
        node={node}
        threads={threads}
        defaultPosition={{ x: 999, y: 999 }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit Update: Tracks lead to the cave' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kind')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(updateLoomNode).toHaveBeenCalledWith(3, expect.objectContaining({ x: 250, y: 60, kind: 'update' })),
    )
  })

  it('shows a save error inline', async () => {
    vi.spyOn(api, 'createLoomNode').mockRejectedValue(new Error('Failed to create node'))
    const user = userEvent.setup()
    render(
      <LoomNodeEditor threads={threads} defaultPosition={{ x: 0, y: 0 }} onClose={() => {}} onSaved={() => {}} />,
    )

    await user.type(screen.getByLabelText('Title'), 'Doomed note')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Failed to create node')
  })
})

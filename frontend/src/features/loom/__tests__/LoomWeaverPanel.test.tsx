import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomThread } from '../../../api/types'
import { LoomWeaverPanel } from '../LoomWeaverPanel'

const threads: LoomThread[] = [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }]

const beatNode: LoomNode = {
  id: 4,
  kind: 'beat',
  title: 'Confront the goblin chief',
  body: 'The goblin chief knows where the puppy ended up.',
  session_tag: 'Session 12',
  x: 400,
  y: 75,
  thread_ids: [1],
}

const sessionNode: LoomNode = {
  id: 1,
  kind: 'session',
  title: 'Puppy goes missing in the village',
  x: 0,
  y: 0,
  thread_ids: [1],
}

const noop = () => {}

const baseProps = {
  threads,
  onEdit: noop,
  onDeleteNode: noop,
  onFulfilNode: noop,
  onBankNode: noop,
  onReplaceNode: noop,
  onSpawnThread: noop,
  onChangeEnding: noop,
  onUndoFulfil: noop,
}

describe('LoomWeaverPanel', () => {
  it('renders a selected beat node\'s title and kind', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={beatNode} />)
    expect(screen.getByText('Confront the goblin chief')).toBeInTheDocument()
    expect(screen.getByText('Story Beat')).toBeInTheDocument()
    expect(screen.getByText('Session 12')).toBeInTheDocument()
    expect(screen.getByText('The goblin chief knows where the puppy ended up.')).toBeInTheDocument()
  })

  it('renders a selected session node\'s kind', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={sessionNode} />)
    expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument()
    expect(screen.getByText('Session Tag')).toBeInTheDocument()
  })

  it('renders the legend when selection is null', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} />)
    expect(screen.getByText('Story beat')).toBeInTheDocument()
    expect(screen.getByText('Recorded session')).toBeInTheDocument()
  })

  it('shows edit/delete actions for a beat node', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={beatNode} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('exposes beat lifecycle commands for a placed beat', async () => {
    const user = userEvent.setup()
    const onFulfilNode = vi.fn()
    const onBankNode = vi.fn()
    const onReplaceNode = vi.fn()
    render(
      <LoomWeaverPanel
        {...baseProps}
        selectedNode={beatNode}
        onFulfilNode={onFulfilNode}
        onBankNode={onBankNode}
        onReplaceNode={onReplaceNode}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Fulfil Beat' }))
    await user.click(screen.getByRole('button', { name: 'Bank Beat' }))
    await user.click(screen.getByRole('button', { name: 'Replace Beat' }))
    expect(onFulfilNode).toHaveBeenCalledWith(beatNode)
    expect(onBankNode).toHaveBeenCalledWith(beatNode)
    expect(onReplaceNode).toHaveBeenCalledWith(beatNode)
  })

  it('hides edit/delete for start/end nodes', () => {
    const startNode: LoomNode = { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] }
    render(<LoomWeaverPanel {...baseProps} selectedNode={startNode} />)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows spawn thread action for session nodes', async () => {
    const user = userEvent.setup()
    const onSpawnThread = vi.fn()
    render(
      <LoomWeaverPanel
        {...baseProps}
        selectedNode={sessionNode}
        onSpawnThread={onSpawnThread}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Spawn Thread' }))
    expect(onSpawnThread).toHaveBeenCalledWith(sessionNode)
  })
})

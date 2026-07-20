import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomTapestryThread } from '../../../api/types'
import { LoomRail } from '../LoomRail'

const threads: LoomTapestryThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Dragon Quest', color: 'thread-1' },
]

const threadNodes: LoomNode[] = [
  {
    id: 10,
    kind: 'beat',
    title: 'A beat',
    thread_id: 1,
    session_id: null,
    position: 0,
    carried_count: 0,
  },
]

const noop = () => {}

const baseProps = {
  selectedNode: null,
  threads,
  onEdit: noop,
  onDeleteNode: noop,
  onFulfilNode: noop,
  onBankNode: noop,
  onReplaceNode: noop,
  onSpawnThread: noop,
  onChangeEnding: noop,
  onUndoFulfil: noop,
  nodes: threadNodes,
  onSelectNode: noop,
  onRestoreNode: noop,
}

describe('LoomRail', () => {
  it('calls onBankNodeById when a beat card is dropped on the beat bank section', () => {
    const onBankNodeById = vi.fn()
    render(<LoomRail {...baseProps} onBankNodeById={onBankNodeById} />)

    const heading = screen.getByText('Beat Bank')
    const section = heading.closest('.loom-weaver-section')!

    const dragData = JSON.stringify({ action: 'reorder', nodeId: 42, fromBodyIndex: 1, sourceThreadId: 1, nodeKind: 'beat' })

    fireEvent.dragOver(section, { dataTransfer: { getData: () => dragData } })
    expect(section.classList.contains('loom-weaver-section--drag-over')).toBe(true)

    fireEvent.drop(section, { dataTransfer: { getData: () => dragData } })
    expect(onBankNodeById).toHaveBeenCalledWith(42)
  })

  it('renders thread inspector when a thread is selected and no node is selected', () => {
    render(<LoomRail {...baseProps} selectedThreadId={1} />)
    expect(screen.getByRole('heading', { name: 'The Lost Puppy' })).toBeInTheDocument()
    const swatches = document.querySelectorAll('.loom-weaver-thread-swatch')
    expect(swatches[0]).toHaveAttribute('data-color', 'thread-3')
    expect(screen.getByText('1 nodes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit thread/i })).toBeInTheDocument()
    expect(screen.queryByText('Start node')).not.toBeInTheDocument()
  })

  it('shows banked-from provenance when a restored beat is inspected', () => {
    const restoredNode: LoomNode = {
      id: 23,
      kind: 'beat',
      title: 'Restored Beat',
      thread_id: 2,
      session_id: null,
      position: 0,
      carried_count: 0,
      banked_from_thread_id: 1,
    }
    render(<LoomRail {...baseProps} selectedNode={restoredNode} />)
    expect(screen.getByText('Banked from')).toBeInTheDocument()
    expect(screen.getByText('The Lost Puppy')).toBeInTheDocument()
  })

  it('ignores drop of non-beat nodes on the beat bank section', () => {
    const onBankNodeById = vi.fn()
    render(<LoomRail {...baseProps} onBankNodeById={onBankNodeById} />)

    const heading = screen.getByText('Beat Bank')
    const section = heading.closest('.loom-weaver-section')!

    const dragData = JSON.stringify({ action: 'reorder', nodeId: 7, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'session' })

    fireEvent.dragOver(section, { dataTransfer: { getData: () => dragData } })
    fireEvent.drop(section, { dataTransfer: { getData: () => dragData } })
    expect(onBankNodeById).not.toHaveBeenCalled()
  })
})

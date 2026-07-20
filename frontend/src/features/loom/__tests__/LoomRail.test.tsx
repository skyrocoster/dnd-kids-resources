import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomTapestryThread } from '../../../api/types'
import { LoomRail } from '../LoomRail'

const threads: LoomTapestryThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3', items: [{ node_id: 10, position: 0 }] },
  { id: 2, name: 'Dragon Quest', color: 'thread-1', items: [] },
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
  nodes: [] as LoomNode[],
  onSelectNode: noop,
  onRestoreNode: noop,
}

describe('LoomRail', () => {
  it('renders thread names and color swatches', () => {
    render(<LoomRail {...baseProps} />)
    expect(screen.getByText('The Lost Puppy')).toBeInTheDocument()
    expect(screen.getByText('Dragon Quest')).toBeInTheDocument()
    const swatches = document.querySelectorAll('.loom-weaver-thread-swatch')
    expect(swatches[0]).toHaveAttribute('data-color', 'thread-3')
    expect(swatches[1]).toHaveAttribute('data-color', 'thread-1')
  })

  it('shows item count for each thread', () => {
    render(<LoomRail {...baseProps} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('sets aria-pressed on the clicked thread button', async () => {
    const user = userEvent.setup()
    let selectedThreadId: number | null = null
    const handleSelectThread = (threadId: number) => { selectedThreadId = threadId }
    const { rerender } = render(<LoomRail {...baseProps} selectedThreadId={null} onSelectThread={handleSelectThread} />)
    const buttons = screen.getAllByRole('button', { name: /The Lost Puppy|Dragon Quest/ })
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    await user.click(buttons[0])
    rerender(<LoomRail {...baseProps} selectedThreadId={selectedThreadId} onSelectThread={handleSelectThread} />)
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('shifts aria-pressed when a different thread is clicked', async () => {
    const user = userEvent.setup()
    let selectedThreadId: number | null = null
    const handleSelectThread = (threadId: number) => { selectedThreadId = threadId }
    const { rerender } = render(<LoomRail {...baseProps} selectedThreadId={null} onSelectThread={handleSelectThread} />)
    const buttons = screen.getAllByRole('button', { name: /The Lost Puppy|Dragon Quest/ })
    await user.click(buttons[0])
    rerender(<LoomRail {...baseProps} selectedThreadId={selectedThreadId} onSelectThread={handleSelectThread} />)
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    await user.click(buttons[1])
    rerender(<LoomRail {...baseProps} selectedThreadId={selectedThreadId} onSelectThread={handleSelectThread} />)
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  })

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

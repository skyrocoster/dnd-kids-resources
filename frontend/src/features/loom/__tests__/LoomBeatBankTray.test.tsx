import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomThread } from '../../../api/types'
import { LoomBeatBankTray } from '../LoomBeatBankTray'

const threads: LoomThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Dragon Quest', color: 'thread-1' },
]

const bankedNode: LoomNode = { id: 9, kind: 'beat', title: 'Mysterious hooded stranger', thread_id: null, position: 0, carried_count: 0 }

describe('LoomBeatBankTray', () => {
  it('lists banked beats and reports the count', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('shows an empty message when nothing is banked', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    expect(screen.getByText('Beat Bank (0)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    expect(screen.getByText('No banked beats.')).toBeInTheDocument()
  })

  it('calls onActivateNode when a beat card is activated and threads exist', async () => {
    const user = userEvent.setup()
    const onActivateNode = vi.fn()
    render(
      <LoomBeatBankTray
        nodes={[bankedNode]}
        threads={threads}
        onSelectNode={() => {}}
        onRestoreNode={() => {}}
        onActivateNode={onActivateNode}
        onManageThreads={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    await user.click(screen.getByText('Mysterious hooded stranger'))
    expect(onActivateNode).toHaveBeenCalledWith(bankedNode)
  })

  it('activates a beat card via Enter key', async () => {
    const user = userEvent.setup()
    const onActivateNode = vi.fn()
    render(
      <LoomBeatBankTray
        nodes={[bankedNode]}
        threads={threads}
        onSelectNode={() => {}}
        onRestoreNode={() => {}}
        onActivateNode={onActivateNode}
        onManageThreads={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    screen.getByRole('button', { name: 'Mysterious hooded stranger' }).focus()
    await user.keyboard('{Enter}')
    expect(onActivateNode).toHaveBeenCalledWith(bankedNode)
  })

  it('shows a guard message instead of activating when there are no threads', async () => {
    const user = userEvent.setup()
    const onActivateNode = vi.fn()
    const onManageThreads = vi.fn()
    render(
      <LoomBeatBankTray
        nodes={[bankedNode]}
        threads={[]}
        onSelectNode={() => {}}
        onRestoreNode={() => {}}
        onActivateNode={onActivateNode}
        onManageThreads={onManageThreads}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    await user.click(screen.getByText('Mysterious hooded stranger'))
    expect(onActivateNode).not.toHaveBeenCalled()
    expect(screen.getByText('Create a thread before placing this beat.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Manage Threads' }))
    expect(onManageThreads).toHaveBeenCalled()
  })

  it('collapses and expands on toggle', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    const toggle = screen.getByRole('button', { name: /Beat Bank/ })
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
    await user.click(toggle)
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
  })

  it('expands and collapses the tray from the keyboard', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    const toggle = screen.getByRole('button', { name: /Beat Bank/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
  })

  it('shows the no-thread guard on keyboard activation without activating the beat', async () => {
    const user = userEvent.setup()
    const onActivateNode = vi.fn()
    render(
      <LoomBeatBankTray
        nodes={[bankedNode]}
        threads={[]}
        onSelectNode={() => {}}
        onRestoreNode={() => {}}
        onActivateNode={onActivateNode}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    const entry = screen.getByRole('button', { name: bankedNode.title })
    entry.focus()
    await user.keyboard('{Enter}')

    expect(onActivateNode).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Create a thread before placing this beat.')
  })

  it('keeps drag restore separate from activation and the no-thread guard', async () => {
    const user = userEvent.setup()
    const onActivateNode = vi.fn()
    render(
      <LoomBeatBankTray
        nodes={[bankedNode]}
        threads={[]}
        onSelectNode={() => {}}
        onRestoreNode={() => {}}
        onActivateNode={onActivateNode}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    const entry = screen.getByRole('button', { name: bankedNode.title })
    const dataTransfer = { effectAllowed: '', setData: vi.fn() }

    fireEvent.dragStart(entry, { dataTransfer })

    expect(entry).toHaveAttribute('draggable')
    expect(dataTransfer.effectAllowed).toBe('move')
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify({ action: 'restore', nodeId: bankedNode.id }),
    )
    expect(onActivateNode).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
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

  it('makes tray entries draggable for drag-to-gap restore', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    const entry = document.querySelector('.loom-beat-bank-tray-entry')
    expect(entry).toHaveAttribute('draggable')
  })
})

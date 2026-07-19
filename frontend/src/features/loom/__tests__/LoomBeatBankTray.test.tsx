import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomThread } from '../../../api/types'
import { LoomBeatBankTray } from '../LoomBeatBankTray'

const threads: LoomThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Dragon Quest', color: 'thread-1' },
]

const bankedNode: LoomNode = { id: 9, kind: 'beat', title: 'Mysterious hooded stranger', x: 1, y: 2, thread_ids: [] }

describe('LoomBeatBankTray', () => {
  it('lists banked beats and reports the count', () => {
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('shows an empty message when nothing is banked', () => {
    render(<LoomBeatBankTray nodes={[]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    expect(screen.getByText('Beat Bank (0)')).toBeInTheDocument()
    expect(screen.getByText('No banked beats.')).toBeInTheDocument()
  })

  it('calls onSelectNode when a beat name is clicked', async () => {
    const user = userEvent.setup()
    const onSelectNode = vi.fn()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={onSelectNode} onRestoreNode={() => {}} />)
    await user.click(screen.getByText('Mysterious hooded stranger'))
    expect(onSelectNode).toHaveBeenCalledWith(bankedNode)
  })

  it('shows a thread picker when Restore is clicked, then confirms restore', async () => {
    const user = userEvent.setup()
    const onRestoreNode = vi.fn()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={onRestoreNode} />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(screen.getByText('Restore to:')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('1')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onRestoreNode).toHaveBeenCalledWith(bankedNode, 1)
  })

  it('allows selecting a different thread in the restore picker', async () => {
    const user = userEvent.setup()
    const onRestoreNode = vi.fn()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={onRestoreNode} />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.selectOptions(screen.getByRole('combobox'), '2')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onRestoreNode).toHaveBeenCalledWith(bankedNode, 2)
  })

  it('cancels restore without calling onRestoreNode', async () => {
    const user = userEvent.setup()
    const onRestoreNode = vi.fn()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={onRestoreNode} />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onRestoreNode).not.toHaveBeenCalled()
    expect(screen.queryByText('Restore to:')).not.toBeInTheDocument()
  })

  it('collapses and expands on toggle', async () => {
    const user = userEvent.setup()
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={threads} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    const toggle = screen.getByRole('button', { name: /Beat Bank/ })
    await user.click(toggle)
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('disables restore when there are no threads', () => {
    render(<LoomBeatBankTray nodes={[bankedNode]} threads={[]} onSelectNode={() => {}} onRestoreNode={() => {}} />)
    expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled()
  })
})

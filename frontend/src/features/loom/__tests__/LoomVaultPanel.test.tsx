import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode } from '../../../api/types'
import { LoomVaultPanel } from '../LoomVaultPanel'

const vaultNode: LoomNode = { id: 7, kind: 'beat', title: 'Mysterious hooded stranger', x: 400, y: 300, thread_ids: [] }

describe('LoomVaultPanel', () => {
  it('lists vault nodes and reports the count', () => {
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={() => {}} onRestoreNode={() => {}} canRestore />)
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('shows an empty message when nothing is unwired', () => {
    render(<LoomVaultPanel nodes={[]} onSelectNode={() => {}} onRestoreNode={() => {}} canRestore />)
    expect(screen.getByText('Beat Bank (0)')).toBeInTheDocument()
    expect(screen.getByText('No banked beats.')).toBeInTheDocument()
  })

  it('calls onSelectNode when an entry is clicked', async () => {
    const user = userEvent.setup()
    const onSelectNode = vi.fn()
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={onSelectNode} onRestoreNode={() => {}} canRestore />)
    await user.click(screen.getByText('Mysterious hooded stranger'))
    expect(onSelectNode).toHaveBeenCalledWith(vaultNode)
  })

  it('restores a banked beat through the row action', async () => {
    const user = userEvent.setup()
    const onRestoreNode = vi.fn()
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={() => {}} onRestoreNode={onRestoreNode} canRestore />)

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(onRestoreNode).toHaveBeenCalledWith(vaultNode)
  })

  it('collapses and expands on toggle', async () => {
    const user = userEvent.setup()
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={() => {}} onRestoreNode={() => {}} canRestore />)
    const toggle = screen.getByRole('button', { name: /Beat Bank/ })
    await user.click(toggle)
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })
})

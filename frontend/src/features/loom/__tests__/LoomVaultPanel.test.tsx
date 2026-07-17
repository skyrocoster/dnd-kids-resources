import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode } from '../../../api/types'
import { LoomVaultPanel } from '../LoomVaultPanel'

const vaultNode: LoomNode = { id: 7, kind: 'update', title: 'Mysterious hooded stranger', x: 400, y: 300, thread_ids: [] }

describe('LoomVaultPanel', () => {
  it('lists vault nodes and reports the count', () => {
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={() => {}} />)
    expect(screen.getByText('Idea Vault (1)')).toBeInTheDocument()
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('shows an empty message when nothing is unwired', () => {
    render(<LoomVaultPanel nodes={[]} onSelectNode={() => {}} />)
    expect(screen.getByText('Idea Vault (0)')).toBeInTheDocument()
    expect(screen.getByText('Nothing unwired.')).toBeInTheDocument()
  })

  it('calls onSelectNode when an entry is clicked', async () => {
    const user = userEvent.setup()
    const onSelectNode = vi.fn()
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={onSelectNode} />)
    await user.click(screen.getByText('Mysterious hooded stranger'))
    expect(onSelectNode).toHaveBeenCalledWith(vaultNode)
  })

  it('collapses and expands on toggle', async () => {
    const user = userEvent.setup()
    render(<LoomVaultPanel nodes={[vaultNode]} onSelectNode={() => {}} />)
    const toggle = screen.getByRole('button', { name: /Idea Vault/ })
    await user.click(toggle)
    expect(screen.queryByText('Mysterious hooded stranger')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })
})

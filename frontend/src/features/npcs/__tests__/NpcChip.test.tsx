import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NpcChip } from '../NpcChip'

describe('NpcChip', () => {
  it('shows the resolved name from the roster', () => {
    const roster = new Map([[4, 'Elder Rosalind']])
    render(<NpcChip npcId={4} roster={roster} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Elder Rosalind/ })).toBeInTheDocument()
  })

  it('falls back to NPC #{id} only for an id not present in the roster', () => {
    const roster = new Map([[4, 'Elder Rosalind']])
    render(<NpcChip npcId={99} roster={roster} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /NPC #99/ })).toBeInTheDocument()
  })

  it('calls onClick with the npc id when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const roster = new Map([[4, 'Elder Rosalind']])
    render(<NpcChip npcId={4} roster={roster} onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /Elder Rosalind/ }))
    expect(onClick).toHaveBeenCalledWith(4)
  })
})

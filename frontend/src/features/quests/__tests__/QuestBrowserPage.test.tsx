import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Quest } from '../../../api/types'
import { QuestBrowserPage } from '../QuestBrowserPage'

const quests: Quest[] = [
  { id: 1, title: 'Lost Puppy', summary: 'A puppy went missing.', reward: ['5 gp'], objectives: [], details: [] },
  { id: 2, title: 'Ancient Amphitheatre', summary: 'A cloak awaits.', reward: [], objectives: [], details: [] },
]

describe('QuestBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])
  })

  it('lists quests sorted by title and shows the first one selected', async () => {
    vi.spyOn(api, 'listQuests').mockResolvedValue(quests)

    render(<QuestBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ancient Amphitheatre' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Ancient Amphitheatre/ })).toBeInTheDocument()
  })

  it('selecting a quest shows its detail card', async () => {
    vi.spyOn(api, 'listQuests').mockResolvedValue(quests)
    const user = userEvent.setup()

    render(<QuestBrowserPage />)
    await waitFor(() => expect(screen.getByText('Lost Puppy')).toBeInTheDocument())

    await user.click(screen.getByText('Lost Puppy'))
    expect(screen.getByRole('heading', { name: 'Lost Puppy' })).toBeInTheDocument()
    expect(screen.getByText('A puppy went missing.')).toBeInTheDocument()
  })

  it('opens the editor when New Quest is clicked', async () => {
    vi.spyOn(api, 'listQuests').mockResolvedValue(quests)
    const user = userEvent.setup()

    render(<QuestBrowserPage />)
    await waitFor(() => expect(screen.getByText('Lost Puppy')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Quest' }))
    expect(screen.getByRole('dialog', { name: 'Add new quest' })).toBeInTheDocument()
  })
})

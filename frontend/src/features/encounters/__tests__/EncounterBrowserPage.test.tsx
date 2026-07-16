import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Encounter } from '../../../api/types'
import { EncounterBrowserPage } from '../EncounterBrowserPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <EncounterBrowserPage />
    </MemoryRouter>
  )
}

function StubRunnerPage() {
  const { id } = useParams()
  return <p>Runner page for encounter {id}</p>
}

function renderPageWithRunRoute() {
  return render(
    <MemoryRouter initialEntries={['/encounters']}>
      <Routes>
        <Route path="/encounters" element={<EncounterBrowserPage />} />
        <Route path="/encounters/:id/run" element={<StubRunnerPage />} />
      </Routes>
    </MemoryRouter>
  )
}

const encounters: Encounter[] = [
  {
    id: 1,
    title: 'Ants',
    creatures: [
      {
        monster_id: 1098,
        original_name: 'Giant Toad',
        name: 'Giant Toad',
        hp_current: 39,
        hp_max: 39,
        ac: null,
        status: 'alive',
        conditions: [],
      },
    ],
  },
  { id: 2, title: 'Kennels', creatures: [] },
]

describe('EncounterBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listMonsters').mockResolvedValue([])
  })

  it('lists encounters sorted by title and shows the first one selected', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue(encounters)

    renderPage()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ants' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Ants/ })).toBeInTheDocument()
    expect(screen.getByText('Giant Toad')).toBeInTheDocument()
  })

  it('selecting an encounter shows its creature list', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue(encounters)
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(screen.getByText('Kennels')).toBeInTheDocument())

    await user.click(screen.getByText('Kennels'))
    expect(screen.getByRole('heading', { name: 'Kennels' })).toBeInTheDocument()
    expect(screen.getByText('No creatures in this encounter.')).toBeInTheDocument()
  })

  it('opens the editor when New Encounter is clicked', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue(encounters)
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ants' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Encounter' }))
    expect(screen.getByRole('dialog', { name: 'Add new encounter' })).toBeInTheDocument()
  })

  it('navigates to the runner page when Run is clicked', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue(encounters)
    const user = userEvent.setup()

    renderPageWithRunRoute()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ants' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(screen.getByText('Runner page for encounter 1')).toBeInTheDocument()
  })
})

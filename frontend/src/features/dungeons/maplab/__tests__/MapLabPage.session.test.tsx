import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import type { NPC } from '../../../../api/types'
import { mapLabLayout } from '../maplabData'
import { MapLabPage } from '../MapLabPage'
import { DungeonRouteContextProvider, type DungeonRouteContext } from '../dungeonRouteContext'

const dungeonDataFixture = {
  rooms: [
    {
      room_id: 17,
      title: 'Training Hall',
      npcs: [9],
      entries: [
        { entry_type: 'feature', title: 'Banner', content: 'Ancient banners hang above the arena.' },
        { entry_type: 'trap', title: 'Loose Flagstones', content: 'Creatures trigger 1d6 darts.' },
        { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
        { entry_type: 'treasure', title: 'Hidden Cache', content: 'A niche in the wall.', treasure_contents: [{ name: 'Ruby', quantity: 2 }] },
      ],
    },
    {
      room_id: 23,
      title: 'Armoury',
      entries: [{ entry_type: 'feature', title: 'Weapon Racks', content: 'Dusty weapons line the walls.' }],
      npcs: [],
    },
    {
      room_id: 33,
      title: 'First Floor Landing',
      entries: [{ entry_type: 'feature', title: 'Balcony', content: 'A narrow overlook faces the courtyard.' }],
      npcs: [],
    },
    {
      room_id: 404,
      title: 'Data Only Room',
      entries: [{ entry_type: 'feature', title: 'Ghost Note', content: 'No geometry should render this.' }],
      npcs: [],
    },
  ],
}

function renderMapLabPage(
  initialEntry: string = '/dungeons/4',
  route: DungeonRouteContext = {
    dungeonId: 4,
    dungeon: { id: 4, title: 'Test Dungeon', data: dungeonDataFixture },
    status: 'ready',
    error: null,
  },
) {
  if (!vi.isMockFunction(api.getDungeonLayout)) {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DungeonRouteContextProvider value={route}>
        <MapLabPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  )
}

async function renderLoadedMapLabPage(initialEntry: string = '/dungeons/4') {
  const utils = renderMapLabPage(initialEntry)
  await flush()
  return utils
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

const miraNpc: NPC = {
  id: 9,
  name: 'Mira',
  race: 'Human',
  background: 'Scout',
  appearance: { hair_colour: 'black', eye_colour: 'brown' },
  notes: 'A careful scout.',
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 18, formula: '4d8' },
  speed: [
    { mode: 'walk', feet: 30, note: null, hover: false },
    { mode: 'climb', feet: 20, note: null, hover: false },
  ],
  abilities: { str: 10, dex: 16, con: 12, int: 11, wis: 14, cha: 9 },
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
  vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
  vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
  vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
  vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
  Element.prototype.scrollIntoView = vi.fn()
})

describe('MapLabPage (Stage 4 — Passage session state)', () => {
  it('toggles door open/closed via session state controls', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })

    // Click selects the door, opening its details panel.
    await user.click(door)
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf-closed')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf')).not.toBeInTheDocument()
  })

  it('toggles lock/unlock via session controls, independent of the trapped state', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    // Authored locked + trapped — trapped takes display precedence.
    expect(door).toHaveAttribute('data-state', 'trapped')

    await user.click(screen.getByRole('checkbox', { name: 'Trap armed' }))
    // Trap disarmed but still locked — the two flags are independent.
    expect(door).toHaveAttribute('data-state', 'locked')

    await user.click(screen.getByRole('checkbox', { name: 'Lock armed' }))
    expect(door).toHaveAttribute('data-state', 'plain')
  })

  it('disarms traps and reflects the change in the passage glyph', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    expect(door).toHaveAttribute('data-state', 'trapped')
    expect(document.querySelector('.maplab-door-badge-layer [data-badge="trap-disarmed"]')).not.toBeInTheDocument()
    expect(document.querySelector('.maplab-door-badge-layer [data-badge="multiple-statuses"]')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Trap armed' }))
    expect(door).toHaveAttribute('data-state', 'locked')
    // Only one active badge (locked) remains — no multiple-statuses or trap-disarmed badges
    expect(document.querySelector('.maplab-door-badge-layer [data-badge="multiple-statuses"]')).not.toBeInTheDocument()
    expect(door).toHaveAccessibleName(/Locked/)
  })

  it('resets all session overrides via a reset button', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    await user.click(screen.getByRole('checkbox', { name: 'Trap armed' }))
    expect(door).toHaveAttribute('data-state', 'locked')
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset dungeon' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    // Back to the authored default: trapped (armed) takes precedence again, door closed.
    expect(door).toHaveAttribute('data-state', 'trapped')
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()
  })

  it('renders World now heading above session controls when a passage is pinned', async () => {
    const user = userEvent.setup()
    const { container } = renderMapLabPage()
    await flush()

    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-subheading')).toHaveTextContent('World now')
  })

  it('nested door open/lock/trap writes preserve sibling leaves and prop session override reaches its marker', async () => {
    const user = userEvent.setup()

    // Provide prop session data — Treasure Chest (id=1) lock.armed overridden to false
    vi.spyOn(api, 'getDungeonSessionState').mockResolvedValue({
      data: { props: { 1: { obstacles: { lock: { armed: false } } } } },
    } as any)

    renderMapLabPage()
    await flush()
    await flush()

    // === Door: nested writes preserve sibling leaves ===
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    // Start: closed, trapped
    expect(door).toHaveAttribute('data-state', 'trapped')
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()

    // Open the door
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()

    // Disarm trap — leaf stays open (sibling leaf preserved)
    await user.click(screen.getByRole('checkbox', { name: 'Trap armed' }))
    expect(door).toHaveAttribute('data-state', 'locked')
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()

    // Unlock — leaf stays open
    await user.click(screen.getByRole('checkbox', { name: 'Lock armed' }))
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()

    // === Prop: session override reaches marker ===
    // Treasure Chest is authored as locked but session overrides lock.armed=false
    const chest = screen.getByRole('button', { name: /Treasure Chest/ })
    expect(chest).toHaveAttribute('data-state', 'plain')
  })
})

describe('MapLabPage (Stage 03 — viewer status chip action failures)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows save failure copy in the canvas status chip when session PUT rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'saveDungeonSessionState').mockRejectedValue(new Error('network'))
    renderMapLabPage()
    await flush()

    // The Rusty Trap Door starts closed (defaultPassageSession isOpen: false),
    // so after pinning it, the inspector shows "Open door".
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))

    const chip = await screen.findByText("Couldn't save session changes. Try again.")
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('role', 'status')
    // Chip lives inside the canvas status area.
    expect(chip.closest('.maplab-map-status')).toBeInTheDocument()
  })

  it('shows reset failure copy in the canvas status chip when session DELETE rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'resetDungeonSessionState').mockRejectedValue(new Error('network'))
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'Reset dungeon' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await flush()

    const chip = screen.getByText("Couldn't reset dungeon. Try again.")
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('role', 'status')
    expect(chip.closest('.maplab-map-status')).toBeInTheDocument()
  })

  it('shows at-table failure copy in the canvas status chip when setAtTheTable rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getAtTheTable').mockResolvedValue({ dungeon_id: null })
    vi.spyOn(api, 'setAtTheTable').mockRejectedValue(new Error('network'))
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'Put at the table' }))
    await flush()

    const chip = screen.getByText("Couldn't put this map at the table. Try again.")
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('role', 'status')
    expect(chip.closest('.maplab-map-status')).toBeInTheDocument()
  })

  it('clears a stale save error when the next passage toggle succeeds', async () => {
    const user = userEvent.setup()
    const saveSpy = vi.spyOn(api, 'saveDungeonSessionState')
    renderMapLabPage()
    await flush()

    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    saveSpy.mockRejectedValue(new Error('network'))
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))

    expect(await screen.findByText("Couldn't save session changes. Try again.")).toBeInTheDocument()

    // Switch mock to resolve before the next toggle so it succeeds.
    saveSpy.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
    // Next toggle (succeeds) — clearViewerStatus removes the stale error
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    await flush()

    expect(screen.queryByText("Couldn't save session changes. Try again.")).not.toBeInTheDocument()
  })

  it('clears a stale at-table error when a door is toggled', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
    vi.spyOn(api, 'getAtTheTable').mockResolvedValue({ dungeon_id: null })
    vi.spyOn(api, 'setAtTheTable').mockRejectedValueOnce(new Error('network'))
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'Put at the table' }))
    await flush()
    expect(screen.getByText("Couldn't put this map at the table. Try again.")).toBeInTheDocument()

    // Toggle a door — clears the stale at-table error
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))
    await flush()

    expect(screen.queryByText("Couldn't put this map at the table. Try again.")).not.toBeInTheDocument()
  })

  it('ConfirmDialog still appears after a reset failure', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'resetDungeonSessionState').mockRejectedValue(new Error('network'))
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'Reset dungeon' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await flush()

    // Error shows and confirm dialog is gone
    expect(screen.getByText("Couldn't reset dungeon. Try again.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    // Click reset again — ConfirmDialog re-appears
    await user.click(screen.getByRole('button', { name: 'Reset dungeon' }))
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('does not show success messages or toasts after save', async () => {
    renderMapLabPage()
    await flush()

    // The chip should not appear when no errors occurred
    expect(screen.queryByText(/Couldn't/)).not.toBeInTheDocument()
  })

  it('selecting a room does not persist partyRoomId', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    // Selecting a room changes only activeRoomId (local UI state), not session state
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    await user.click(hall)
    await flush()
    await flush()

    // No save payload should include a partyRoomId after a simple room selection
    expect(api.saveDungeonSessionState).not.toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        data: expect.objectContaining({ partyRoomId: expect.any(Number) }),
      }),
    )
  })

  it('Party is here persists the selected room as partyRoomId', async () => {
    const user = userEvent.setup()
    const saveSpy = vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(
      undefined as unknown as { data: Record<string, unknown> },
    )
    renderMapLabPage()
    // First flush: initial load settles (404 → empty state, skipNextSaveRef = true)
    await flush()
    await flush()

    // Select a room first — changes only local UI state, no session side effects
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    await user.click(hall)
    await flush()
    await flush()

    // Click Party is here — saves the selected room's id as partyRoomId
    await user.click(screen.getByRole('button', { name: 'Party is here' }))
    await flush()

    // Verify the save was triggered for this room
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        4,
        expect.objectContaining({
          data: expect.objectContaining({ partyRoomId: 17 }),
        }),
      )
    })
  })

  it('marks the persisted party room in the DM map view', async () => {
    vi.mocked(api.getDungeonSessionState).mockResolvedValue({ data: { partyRoomId: 17 } })

    await renderLoadedMapLabPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Training Hall.*party location/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Training Hall.*party location/i })).toHaveAttribute('data-party', 'true')
  })
})

describe('MapLabPage (Stage 6 — at-the-table control)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows "Put at the table" when this dungeon is not at the table, and sets it on click', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getAtTheTable').mockResolvedValue({ dungeon_id: null })
    vi.spyOn(api, 'setAtTheTable').mockResolvedValue({ dungeon_id: 4 })

    renderMapLabPage()
    await flush()

    const button = screen.getByRole('button', { name: 'Put at the table' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)
    await flush()

    expect(api.setAtTheTable).toHaveBeenCalledWith({ dungeon_id: 4 })
    expect(screen.getByRole('button', { name: 'At the table' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows "At the table" already pressed and disabled when this dungeon is already at the table', async () => {
    vi.spyOn(api, 'getAtTheTable').mockResolvedValue({ dungeon_id: 4 })

    renderMapLabPage()
    await flush()

    const button = screen.getByRole('button', { name: 'At the table' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toBeDisabled()
  })

  it('shows error message when putting at the table fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getAtTheTable').mockResolvedValue({ dungeon_id: null })
    vi.spyOn(api, 'setAtTheTable').mockRejectedValue(new Error('network'))

    renderMapLabPage()
    await flush()

    const button = screen.getByRole('button', { name: 'Put at the table' })
    await user.click(button)
    await flush()

    const error = screen.getByText("Couldn't put this map at the table. Try again.")
    expect(error).toBeInTheDocument()
    expect(error).toHaveAttribute('role', 'status')
  })
})

import { describe, expect, it } from 'vitest'
import type { Dungeon } from '../../../api/types'
import { dungeonToFormState, emptyDungeonForm, formStateToDungeonInput } from '../dungeonForm'

const baseDungeon: Dungeon = {
  id: 1,
  title: 'Greenhouse',
  data: {
    general_info: { title: 'Greenhouse', size: 'small', illumination: null, temperature: null, walls: null, floor: null },
    rooms: [{ room_id: 1, title: 'Entrance', entries: [{ title: 'Sign', content: 'Welcome', entry_type: 'feature' }] }],
    doors: [{ door_id: 1, title: 'Front Door', content: '', entry_type: 'door', is_hidden: false, leads_to: [1, 2] }],
    corridors: [],
    map_image: 'x.png',
  },
}

describe('dungeonToFormState', () => {
  it('flattens general_info/rooms/doors and preserves unknown keys', () => {
    const form = dungeonToFormState(baseDungeon)
    expect(form.title).toBe('Greenhouse')
    expect(form.size).toBe('small')
    expect(form.rooms).toHaveLength(1)
    expect(form.rooms[0].title).toBe('Entrance')
    expect(form.rooms[0].entries[0].content).toBe('Welcome')
    expect(form.doors[0].leadsTo).toBe('1, 2')
    expect(form.extraData).toEqual({ corridors: [], map_image: 'x.png' })
  })
})

describe('formStateToDungeonInput', () => {
  it('round-trips rooms/doors and re-merges preserved unknown keys', () => {
    const input = formStateToDungeonInput(dungeonToFormState(baseDungeon))
    expect(input.title).toBe('Greenhouse')
    const data = input.data as Record<string, unknown>
    expect(data.corridors).toEqual([])
    expect(data.map_image).toBe('x.png')
    const rooms = data.rooms as Array<Record<string, unknown>>
    expect(rooms[0].room_id).toBe(1)
    const doors = data.doors as Array<Record<string, unknown>>
    expect(doors[0].leads_to).toEqual([1, 2])
  })

  it('produces an empty rooms/doors structure for a blank form', () => {
    const input = formStateToDungeonInput(emptyDungeonForm())
    const data = input.data as Record<string, unknown>
    expect(data.rooms).toEqual([])
    expect(data.doors).toEqual([])
  })
})

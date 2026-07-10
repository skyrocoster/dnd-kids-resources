import type { Dungeon, DungeonInput } from '../../api/types'
import type { DungeonData } from './dungeonModel'
import { parseDungeonData } from './dungeonModel'

let rowIdCounter = 0
function nextRowId(prefix: string): string {
  rowIdCounter += 1
  return `${prefix}-${rowIdCounter}`
}

export interface DungeonRoomEntryForm {
  id: string
  title: string
  content: string
}

export interface DungeonRoomForm {
  id: string
  roomId: number
  title: string
  entries: DungeonRoomEntryForm[]
}

export interface DungeonDoorForm {
  id: string
  doorId: number
  title: string
  content: string
  leadsTo: string
  isHidden: boolean
}

export interface DungeonFormState {
  title: string
  generalInfoTitle: string
  size: string
  illumination: string
  temperature: string
  walls: string
  floor: string
  rooms: DungeonRoomForm[]
  doors: DungeonDoorForm[]
  extraData: Record<string, unknown>
}

export function emptyDungeonForm(): DungeonFormState {
  return {
    title: '',
    generalInfoTitle: '',
    size: '',
    illumination: '',
    temperature: '',
    walls: '',
    floor: '',
    rooms: [],
    doors: [],
    extraData: {},
  }
}

export function dungeonToFormState(dungeon: Dungeon): DungeonFormState {
  const data = parseDungeonData(dungeon.data)
  const generalInfo = data.general_info || {}

  const rooms = (data.rooms || []).map((room) => ({
    id: nextRowId('room'),
    roomId: room.room_id,
    title: room.title,
    entries: (room.entries || []).map((entry) => ({
      id: nextRowId('entry'),
      title: entry.title,
      content: entry.content,
    })),
  }))

  const doors = (data.doors || []).map((door) => ({
    id: nextRowId('door'),
    doorId: door.door_id,
    title: door.title,
    content: door.content,
    leadsTo: door.leads_to.join(', '),
    isHidden: door.is_hidden || false,
  }))

  // Extract extra data (anything that's not the standard keys we handle above)
  const rawData = dungeon.data as Record<string, unknown>
  const { general_info, rooms: _r, doors: _d, ...extraData } = rawData

  return {
    title: dungeon.title || '',
    generalInfoTitle: generalInfo.title || '',
    size: generalInfo.size || '',
    illumination: generalInfo.illumination || '',
    temperature: generalInfo.temperature || '',
    walls: generalInfo.walls || '',
    floor: generalInfo.floor || '',
    rooms,
    doors,
    extraData,
  }
}

function nextRoomId(rooms: DungeonRoomForm[]): number {
  return rooms.reduce((max, r) => Math.max(max, r.roomId), 0) + 1
}

function nextDoorId(doors: DungeonDoorForm[]): number {
  return doors.reduce((max, d) => Math.max(max, d.doorId), 0) + 1
}

export function addRoom(rooms: DungeonRoomForm[]): DungeonRoomForm[] {
  return [...rooms, { id: nextRowId('room'), roomId: nextRoomId(rooms), title: '', entries: [] }]
}

export function addRoomEntry(entries: DungeonRoomEntryForm[]): DungeonRoomEntryForm[] {
  return [...entries, { id: nextRowId('entry'), title: '', content: '' }]
}

export function addDoor(doors: DungeonDoorForm[]): DungeonDoorForm[] {
  return [...doors, { id: nextRowId('door'), doorId: nextDoorId(doors), title: '', content: '', leadsTo: '', isHidden: false }]
}

export function formStateToDungeonInput(form: DungeonFormState): DungeonInput {
  const general_info = {
    title: form.generalInfoTitle || null,
    size: form.size || null,
    illumination: form.illumination || null,
    temperature: form.temperature || null,
    walls: form.walls || null,
    floor: form.floor || null,
  }

  const rooms = form.rooms.map((room) => ({
    room_id: room.roomId,
    title: room.title,
    entries: room.entries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      entry_type: 'feature',
    })),
  }))

  const doors = form.doors.map((door) => ({
    door_id: door.doorId,
    title: door.title,
    content: door.content,
    entry_type: 'door',
    is_hidden: door.isHidden,
    leads_to: door.leadsTo
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => !Number.isNaN(n)),
  }))

  return {
    title: form.title,
    data: {
      ...form.extraData,
      general_info,
      rooms,
      doors,
    },
  }
}

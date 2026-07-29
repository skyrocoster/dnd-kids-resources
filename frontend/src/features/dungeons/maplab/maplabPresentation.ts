import {
  TrapIcon,
  LockIcon,
  UnlockIcon,
  HiddenIcon,
  StairsUpIcon,
  StairsDownIcon,
  StairsIcon,
  RoomIcon,
  ItemIcon,
  DoorOpenIcon,
  DoorClosedIcon,
  type LucideIcon,
} from '../../../components/icons'
import { PROP_KIND_ICONS } from './fixtureTypes'
import {
  PASSAGE_STATE_PRECEDENCE,
  isPassageStateActive,
  effectivePassageState,
  absoluteCells,
  stairDirection,
  type PassageFlags,
  type PassageState,
  type Inspectable,
  type PassageSessionState,
  type MapDoor,
  type MapStair,
} from '../../../model/maplabModel'

export interface PassagePresentation {
  state: PassageState
  icon: LucideIcon
  token: string
  label: string
}

export function passagePresentation(passage: PassageFlags): PassagePresentation {
  if (passage.trapped) {
    return { state: 'trapped', icon: TrapIcon, token: '--md-error', label: 'Trapped' }
  }
  if (passage.locked) {
    return { state: 'locked', icon: LockIcon, token: '--md-passage-locked', label: 'Locked' }
  }
  if (passage.hidden) {
    return { state: 'hidden', icon: HiddenIcon, token: '--md-passage-hidden', label: 'Hidden' }
  }
  return { state: 'unlocked', icon: UnlockIcon, token: '--md-on-surface-variant', label: 'Unlocked' }
}

export function secondaryPassageStates(passage: PassageFlags): PassageState[] {
  const primary = passagePresentation(passage).state
  return PASSAGE_STATE_PRECEDENCE.filter(
    (state) => state !== primary && state !== 'unlocked' && isPassageStateActive(state, passage),
  )
}

export interface PassageStateChip {
  state: PassageState
  icon: LucideIcon
  label: string
}

const PASSAGE_STATE_CHIP_ICONS: Record<Exclude<PassageState, 'unlocked'>, LucideIcon> = {
  trapped: TrapIcon,
  locked: LockIcon,
  hidden: HiddenIcon,
}

const PASSAGE_STATE_CHIP_LABELS: Record<Exclude<PassageState, 'unlocked'>, string> = {
  trapped: 'Trapped',
  locked: 'Locked',
  hidden: 'Hidden',
}

export function passageStateChips(passage: PassageFlags): PassageStateChip[] {
  return PASSAGE_STATE_PRECEDENCE.filter(
    (state): state is Exclude<PassageState, 'unlocked'> =>
      state !== 'unlocked' && isPassageStateActive(state, passage),
  ).map((state) => ({ state, icon: PASSAGE_STATE_CHIP_ICONS[state], label: PASSAGE_STATE_CHIP_LABELS[state] }))
}

export interface InspectableDescriptor {
  title: string
  typeLabel: string
  icon: LucideIcon
  token: string
  chips: PassageStateChip[]
  lines: { label: string; value: string }[]
}

function passageDescriptorLines(passage: PassageFlags): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []
  if (passage.breakDc !== undefined) lines.push({ label: 'Break DC', value: String(passage.breakDc) })
  if (passage.pickDc !== undefined) lines.push({ label: 'Pick DC', value: String(passage.pickDc) })
  if (passage.hiddenDc !== undefined) lines.push({ label: 'Perception DC', value: String(passage.hiddenDc) })
  if (passage.searchDc !== undefined) lines.push({ label: 'Search DC', value: String(passage.searchDc) })
  if (passage.note) lines.push({ label: 'Note', value: passage.note })
  return lines
}

export function inspectableDescriptor(
  target: Inspectable,
  context?: { dungeonTitle?: string },
): InspectableDescriptor {
  switch (target.kind) {
    case 'room': {
      const { room } = target
      const lines: { label: string; value: string }[] = []
      if (room.kind) lines.push({ label: 'Kind', value: room.kind })
      if (room.wallKind) lines.push({ label: 'Wall kind', value: room.wallKind })
      lines.push({ label: 'Size', value: `${absoluteCells(room).length} squares` })
      if (room.description) lines.push({ label: 'Description', value: room.description })
      return {
        title: room.title ?? `Room ${room.room_id}`,
        typeLabel: 'Room',
        icon: RoomIcon,
        token: '--md-on-surface-variant',
        chips: [],
        lines,
      }
    }
    case 'door': {
      const { door, session } = target
      const presentation = doorPresentation(door, session)
      const effective = effectivePassageState(door, session)
      const lines = passageDescriptorLines(effective)
      lines.unshift({ label: 'Position', value: effective.sessionOpen ? 'Open' : 'Closed' })
      if (door.trapped && effective.trapDisarmed) lines.push({ label: 'Trap', value: 'Disarmed' })
      return {
        title: door.title ?? `Door ${door.door_id}`,
        typeLabel: 'Door',
        icon: presentation.icon,
        token: presentation.token,
        chips: passageStateChips(effective),
        lines,
      }
    }
    case 'stair': {
      const { stair, session } = target
      const effective = effectivePassageState(stair, session)
      const presentation = passagePresentation(effective)
      const lines = passageDescriptorLines(effective)
      if (stair.trapped && effective.trapDisarmed) lines.push({ label: 'Trap', value: 'Disarmed' })
      return {
        title: stair.title ?? `Stair ${stair.stair_id}`,
        typeLabel: 'Stair',
        icon: presentation.icon,
        token: presentation.token,
        chips: passageStateChips(effective),
        lines,
      }
    }
    case 'prop': {
      const { prop } = target
      return {
        title: prop.title ?? prop.kind,
        typeLabel: 'Prop',
        icon: PROP_KIND_ICONS[prop.kind] ?? ItemIcon,
        token: passagePresentation(prop).token,
        chips: passageStateChips(prop),
        lines: passageDescriptorLines(prop),
      }
    }
    case 'portal': {
      const { portal, session } = target
      const effective = effectivePassageState(portal, session)
      const presentation = passagePresentation(effective)
      const lines = passageDescriptorLines(effective)
      lines.push(
        portal.to?.dungeon_id !== undefined
          ? { label: 'Leaves to', value: context?.dungeonTitle ?? 'another dungeon' }
          : portal.to?.cell && portal.to.z !== undefined
            ? { label: 'Leads to', value: `${portal.to.cell[0]},${portal.to.cell[1]} (z:${portal.to.z})` }
            : { label: 'Destination', value: 'This portal has no destination yet. Choose where it leads.' },
      )
      return {
        title: portal.title ?? `Portal ${portal.portal_id}`,
        typeLabel: 'Portal',
        icon: presentation.icon,
        token: presentation.token,
        chips: passageStateChips(effective),
        lines,
      }
    }
    case 'feature': {
      const { feature } = target
      const lines: { label: string; value: string }[] = []
      lines.push({ label: 'Kind', value: feature.kind })
      lines.push({ label: 'Size', value: `${feature.cells.length} squares` })
      lines.push({ label: 'Z', value: String(feature.z) })
      return {
        title: feature.title ?? feature.kind,
        typeLabel: 'Feature',
        icon: ItemIcon,
        token: '--md-on-surface-variant',
        chips: [],
        lines,
      }
    }
  }
}

export interface StairPresentation extends PassagePresentation {
  direction: 'up' | 'down' | 'level'
}

export function stairPresentation(stair: MapStair, fromZ?: number, session?: PassageSessionState): StairPresentation {
  const effective = effectivePassageState(stair, session)
  const base = passagePresentation(effective)
  const direction = stairDirection(stair, fromZ)
  const icon =
    base.state === 'unlocked'
      ? direction === 'up'
        ? StairsUpIcon
        : direction === 'down'
          ? StairsDownIcon
          : StairsIcon
      : base.icon
  return { ...base, icon, direction }
}

export interface DoorPresentation extends PassagePresentation {
  isOpen: boolean
}

export function doorPresentation(door: MapDoor, session?: PassageSessionState): DoorPresentation {
  const effective = effectivePassageState(door, session)
  const base = passagePresentation(effective)
  const isOpen = effective.sessionOpen ?? false
  const icon = base.state === 'unlocked' ? (isOpen ? DoorOpenIcon : DoorClosedIcon) : base.icon
  return { ...base, icon, isOpen }
}

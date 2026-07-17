import {
  DoorIcon,
  GemIcon,
  CoinsIcon,
  MasksIcon,
  ShieldIcon,
  SkullIcon,
  SwordsIcon,
  UsersIcon,
  WandIcon,
  WaypointsIcon,
} from '../components/icons'
import type { LucideIcon } from '../components/icons'

export interface NavLinkEntry {
  to: string
  label: string
  linkIcon: LucideIcon
}

export interface NavSection {
  label: string
  icon: LucideIcon
  links: NavLinkEntry[]
}

export const navSections: NavSection[] = [
  {
    label: 'Reference',
    icon: WandIcon,
    links: [
      { to: '/spells', label: 'Spells', linkIcon: WandIcon },
      { to: '/monsters', label: 'Monsters', linkIcon: SkullIcon },
      { to: '/weapons', label: 'Weapons', linkIcon: SwordsIcon },
    ],
  },
  {
    label: 'Campaign',
    icon: UsersIcon,
    links: [
      { to: '/players', label: 'Players', linkIcon: UsersIcon },
      { to: '/npcs', label: 'NPCs', linkIcon: MasksIcon },
      { to: '/loom', label: 'The Loom', linkIcon: WaypointsIcon },
      { to: '/encounters', label: 'Encounters', linkIcon: ShieldIcon },
      { to: '/dungeons', label: 'Dungeons', linkIcon: DoorIcon },
    ],
  },
  {
    label: 'Loot',
    icon: CoinsIcon,
    links: [
      { to: '/items', label: 'Items', linkIcon: GemIcon },
      { to: '/loot', label: 'Loot Bundles', linkIcon: CoinsIcon },
    ],
  },
]

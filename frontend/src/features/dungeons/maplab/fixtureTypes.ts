import {
  PropChestIcon,
  PropTableIcon,
  PropMirrorIcon,
  PropBarrelIcon,
  PropStatueIcon,
  PropIcon,
  type LucideIcon,
} from '../../../components/icons'

export interface FieldSpec {
  key: string
  label: string
  type: 'boolean' | 'number' | 'text' | 'select'
  options?: string[]
  showWhen?: (values: Record<string, unknown>) => boolean
}

export interface FixtureTypeSpec {
  fields: FieldSpec[]
  defaultFlags: Record<string, unknown>
  presentation?: Record<string, unknown>
}

export const PASSAGE_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'trapped', label: 'Trapped', type: 'boolean' },
  { key: 'breakDc', label: 'Break DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'pickDc', label: 'Pick Lock DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'hiddenDc', label: 'Perception DC', type: 'number', showWhen: (values) => values.hidden === true },
  { key: 'note', label: 'Note', type: 'text' },
]

const PROP_KINDS = ['chest', 'table', 'mirror', 'barrel', 'statue', 'other']

const PROP_WALL_SIDES = ['Off', 'N', 'S', 'E', 'W']

export const PROP_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'kind', label: 'Kind', type: 'select', options: PROP_KINDS },
  { key: 'side', label: 'Attach to wall', type: 'select', options: PROP_WALL_SIDES },
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'trapped', label: 'Trapped', type: 'boolean' },
  { key: 'breakDc', label: 'Break DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'pickDc', label: 'Pick Lock DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'hiddenDc', label: 'Perception DC', type: 'number', showWhen: (values) => values.hidden === true },
  { key: 'note', label: 'Note', type: 'text' },
]

export type PropKind = typeof PROP_KINDS[number]

export const PROP_KIND_ICONS: Record<PropKind, LucideIcon> = {
  chest: PropChestIcon,
  table: PropTableIcon,
  mirror: PropMirrorIcon,
  barrel: PropBarrelIcon,
  statue: PropStatueIcon,
  other: PropIcon,
}

export const FIXTURE_TYPES: Record<string, FixtureTypeSpec> = {
  door: {
    fields: PASSAGE_FIELDS,
    defaultFlags: {
      title: '',
      hidden: false,
      locked: false,
      trapped: false,
    },
  },
  prop: {
    fields: PROP_FIELDS,
    defaultFlags: {
      prop_id: 0,
      kind: 'chest',
      cell: [0, 0],
      title: '',
      hidden: false,
      locked: false,
      trapped: false,
    },
  },
}

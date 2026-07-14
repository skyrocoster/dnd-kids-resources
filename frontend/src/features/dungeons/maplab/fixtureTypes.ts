import {
  PropChestIcon,
  PropTableIcon,
  PropMirrorIcon,
  PropBarrelIcon,
  PropStatueIcon,
  PropWindowIcon,
  PropIcon,
  SwordsIcon,
  type LucideIcon,
} from '../../../components/icons'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldSpec {
  key: string
  label: string
  type: 'boolean' | 'number' | 'text' | 'select' | 'encounterPicker' | 'destinationPicker' | 'lootBundlePicker'
  options?: SelectOption[]
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

const PROP_KIND_OPTIONS: SelectOption[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'table', label: 'Table' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'barrel', label: 'Barrel' },
  { value: 'statue', label: 'Statue' },
  { value: 'window', label: 'Window' },
  { value: 'encounter', label: 'Encounter' },
  { value: 'other', label: 'Other' },
]

const PROP_KINDS = PROP_KIND_OPTIONS.map((option) => option.value)

const PROP_WALL_SIDE_OPTIONS: SelectOption[] = [
  { value: 'Off', label: 'On the floor' },
  { value: 'N', label: 'North wall' },
  { value: 'S', label: 'South wall' },
  { value: 'E', label: 'East wall' },
  { value: 'W', label: 'West wall' },
]

export const PROP_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'kind', label: 'Kind', type: 'select', options: PROP_KIND_OPTIONS },
  { key: 'side', label: 'Attach to wall', type: 'select', options: PROP_WALL_SIDE_OPTIONS },
  { key: 'encounter_id', label: 'Encounter', type: 'encounterPicker', showWhen: (values) => values.kind === 'encounter' },
  { key: 'loot', label: 'Loot bundle', type: 'lootBundlePicker', showWhen: (values) => values.kind !== 'encounter' },
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
  window: PropWindowIcon,
  encounter: SwordsIcon,
  other: PropIcon,
}

/** Stair field definitions — PassageFlags only. Destination isn't a generic field: stairs always
 * cross to the adjacent floor at the same [x, y], so it's the bespoke up/down checkbox pair
 * rendered directly in the stair inspector (Phase I), not a `destinationPicker`. */
export const STAIR_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'trapped', label: 'Trapped', type: 'boolean' },
  { key: 'breakDc', label: 'Break DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'pickDc', label: 'Pick Lock DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'hiddenDc', label: 'Perception DC', type: 'number', showWhen: (values) => values.hidden === true },
  { key: 'note', label: 'Note', type: 'text' },
]

/** Portal field definitions — PassageFlags + destination picker (Phase H) */
export const PORTAL_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'to', label: 'Destination', type: 'destinationPicker' },
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'trapped', label: 'Trapped', type: 'boolean' },
  { key: 'breakDc', label: 'Break DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'pickDc', label: 'Pick Lock DC', type: 'number', showWhen: (values) => values.locked === true },
  { key: 'hiddenDc', label: 'Perception DC', type: 'number', showWhen: (values) => values.hidden === true },
  { key: 'note', label: 'Note', type: 'text' },
]

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
  encounter: {
    fields: PROP_FIELDS,
    defaultFlags: {
      prop_id: 0,
      kind: 'encounter',
      cell: [0, 0],
      title: '',
      hidden: false,
      locked: false,
      trapped: false,
      encounter_id: null,
    },
  },
  stair: {
    fields: STAIR_FIELDS,
    defaultFlags: {
      title: '',
      hidden: false,
      locked: false,
      trapped: false,
    },
  },
  portal: {
    fields: PORTAL_FIELDS,
    defaultFlags: {
      title: '',
      hidden: false,
      locked: false,
      trapped: false,
    },
  },
}

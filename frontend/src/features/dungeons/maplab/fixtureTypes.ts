export interface FieldSpec {
  key: string
  label: string
  type: 'boolean' | 'number' | 'text'
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
}

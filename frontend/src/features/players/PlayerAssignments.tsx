import { useId, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { CheckboxField } from '../../components/form/CheckboxField'
import { TextInput } from '../../components/form/TextInput'
import './PlayerAssignments.css'

export interface ManageAssignmentsDialogProps<T> {
  title: string
  items: T[]
  assignedIds: number[]
  getId: (item: T) => number
  getLabel: (item: T) => string
  onSave: (ids: number[]) => Promise<void>
  onClose: () => void
  searchPlaceholder?: string
}

export function ManageAssignmentsDialog<T>({
  title,
  items,
  assignedIds,
  getId,
  getLabel,
  onSave,
  onClose,
  searchPlaceholder = 'Search…',
}: ManageAssignmentsDialogProps<T>) {
  const searchId = useId()
  const [staged, setStaged] = useState<Set<number>>(() => new Set(assignedIds))
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => [...items].sort((a, b) => getLabel(a).localeCompare(getLabel(b))), [items, getLabel])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((item) => getLabel(item).toLowerCase().includes(q))
  }, [sorted, query, getLabel])

  const toggle = (id: number) => {
    setStaged((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(Array.from(staged))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      pending={saving}
      className="manage-assignments-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      {error && (
        <p role="status" className="manage-assignments-error">
          {error}
        </p>
      )}
      <div className="manage-assignments-search">
        <label htmlFor={searchId} className="visually-hidden">
          {searchPlaceholder}
        </label>
        <TextInput
          id={searchId}
          type="search"
          className="manage-assignments-search-input"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="manage-assignments-empty">No matches</p>
      ) : (
        <ul className="manage-assignments-list">
          {filtered.map((item) => {
            const id = getId(item)
            return (
              <li key={id}>
                <CheckboxField
                    label={getLabel(item)}
                    checked={staged.has(id)}
                    onChange={() => toggle(id)}
                  />
              </li>
            )
          })}
        </ul>
      )}
    </Dialog>
  )
}

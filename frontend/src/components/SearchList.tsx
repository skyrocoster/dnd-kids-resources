import { useId, useMemo, useState } from 'react'
import { StatePanel } from './StatePanel'
import './SearchList.css'

export type SearchListVariant = 'spell' | 'monster' | 'weapon' | 'loot' | 'neutral'
export type SearchListStatus = 'ready' | 'loading' | 'error'

interface SearchListProps<T> {
  items: T[]
  getId: (item: T) => string | number
  getLabel: (item: T) => string
  getMeta?: (item: T) => string | undefined
  selectedId?: string | number | null
  onSelect: (item: T) => void
  variant?: SearchListVariant
  searchPlaceholder?: string
  emptyMessage?: string
  status?: SearchListStatus
}

export function SearchList<T>({
  items,
  getId,
  getLabel,
  getMeta,
  selectedId,
  onSelect,
  variant = 'neutral',
  searchPlaceholder = 'Search…',
  emptyMessage,
  status = 'ready',
}: SearchListProps<T>) {
  const [query, setQuery] = useState('')
  const inputId = useId()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => getLabel(item).toLowerCase().includes(q))
  }, [items, query, getLabel])

  const body = () => {
    if (status === 'loading') return <StatePanel status="loading" />
    if (status === 'error') return <StatePanel status="error" message={emptyMessage} />
    if (items.length === 0) return <StatePanel status="empty" message={emptyMessage} />
    if (filtered.length === 0) return <StatePanel status="filteredEmpty" message={emptyMessage} />
    return (
      <ul className="search-list-items">
        {filtered.map((item) => {
          const id = getId(item)
          const isSelected = id === selectedId
          const meta = getMeta?.(item)
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                className={isSelected ? 'search-list-item active' : 'search-list-item'}
                onClick={() => onSelect(item)}
              >
                <span className="search-list-item-label">{getLabel(item)}</span>
                {meta && <span className="search-list-item-meta">{meta}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="search-list" data-variant={variant}>
      <div className="search-list-input-wrap">
        <label htmlFor={inputId} className="visually-hidden">
          {searchPlaceholder}
        </label>
        <input
          id={inputId}
          type="search"
          className="search-list-input"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {body()}
    </div>
  )
}

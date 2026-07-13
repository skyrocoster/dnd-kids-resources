import { useEffect, useId, useRef, useState } from 'react'
import type { Condition } from '../../api/types'
import { CheckboxField } from '../../components/form/CheckboxField'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import { isConditionSelected, mergeConditionOptions, toggleCondition } from './encounterForm'
import './ConditionPicker.css'

interface ConditionPickerProps {
  conditions: Condition[]
  selected: string[]
  onChange: (next: string[]) => void
}

function summaryText(selected: string[]): string {
  if (selected.length === 0) return 'No conditions'
  if (selected.length <= 2) return selected.join(', ')
  return `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`
}

export function ConditionPicker({ conditions, selected, onChange }: ConditionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const options = mergeConditionOptions(conditions, selected)

  return (
    <div className="condition-picker" ref={containerRef}>
      <span className="form-label">Conditions</span>
      <button
        type="button"
        ref={triggerRef}
        className="condition-picker-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="condition-picker-summary">{summaryText(selected)}</span>
        {isOpen ? <ChevronUpIcon size={18} aria-hidden /> : <ChevronDownIcon size={18} aria-hidden />}
      </button>
      {isOpen && (
        <div id={panelId} className="condition-picker-panel" role="group" aria-label="Condition options">
          {options.length === 0 && <p className="encounter-editor-empty">No conditions available.</p>}
          {options.map((option) => (
            <CheckboxField
              key={option.value}
              label={option.label}
              checked={isConditionSelected(selected, option.value)}
              onChange={() => onChange(toggleCondition(selected, option.value))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

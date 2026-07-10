import { useId } from 'react'
import './form.css'

interface Option {
  value: string
  label: string
}

interface MultiSelectFieldProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MultiSelectField({ label, options, selected, onChange }: MultiSelectFieldProps) {
  const groupId = useId()

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <fieldset className="form-field form-multiselect" aria-describedby={groupId}>
      <legend className="form-label">{label}</legend>
      <div className="form-multiselect-options">
        {options.map((option) => {
          const id = `${groupId}-${option.value}`
          return (
            <div className="form-field form-field-checkbox" key={option.value}>
              <input
                id={id}
                type="checkbox"
                className="form-checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <label htmlFor={id} className="form-label form-label-checkbox">
                {option.label}
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

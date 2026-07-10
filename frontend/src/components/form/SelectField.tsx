import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import './form.css'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  options: Option[]
  error?: string
  placeholder?: string
}

export function SelectField({ label, options, error, placeholder, ...rest }: SelectFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select
        id={id}
        className="form-control"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="form-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

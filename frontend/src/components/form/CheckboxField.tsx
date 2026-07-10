import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import './form.css'

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string
}

export function CheckboxField({ label, ...rest }: CheckboxFieldProps) {
  const id = useId()

  return (
    <div className="form-field form-field-checkbox">
      <input id={id} type="checkbox" className="form-checkbox" {...rest} />
      <label htmlFor={id} className="form-label form-label-checkbox">
        {label}
      </label>
    </div>
  )
}

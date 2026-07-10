import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import './form.css'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  multiline?: false
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  error?: string
  multiline: true
}

export function TextField(props: TextFieldProps | TextAreaFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const { label, error, multiline, ...rest } = props

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="form-control form-textarea"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          className="form-control"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && (
        <p className="form-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

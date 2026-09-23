import { NumberField as BaseNumberField } from '@base-ui/react/number-field'
import type { NumberFieldRootProps } from '@base-ui/react/number-field'
import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import './advanced-form.css'
export interface NumberFieldProps extends Omit<NumberFieldRootProps, 'className' | 'id' | 'onValueChange'> {
  label: ReactNode; description?: ReactNode; id?: string; onValueChange?: (value: number | null) => void
  inputProps?: Omit<ComponentPropsWithoutRef<'input'>, 'defaultValue' | 'id' | 'value'>
  decrementLabel?: string; incrementLabel?: string; className?: string
}
export function NumberField({ label, description, id: idProp, onValueChange, inputProps,
  decrementLabel = 'Decrease value', incrementLabel = 'Increase value', className, ...props }: NumberFieldProps) {
  const id = idProp ?? useId()
  return <BaseNumberField.Root {...props} id={id} className={['form-advanced-number', className].filter(Boolean).join(' ')}
    onValueChange={v => onValueChange?.(v)}><label className="form-advanced-label" htmlFor={id}>{label}</label>
    {description && <span className="form-advanced-description">{description}</span>}
    <BaseNumberField.Group className="form-advanced-number-group">
      <BaseNumberField.Decrement className="form-advanced-number-button" aria-label={decrementLabel}><Minus aria-hidden="true" /></BaseNumberField.Decrement>
      <BaseNumberField.Input {...inputProps} className="form-advanced-number-input" />
      <BaseNumberField.Increment className="form-advanced-number-button" aria-label={incrementLabel}><Plus aria-hidden="true" /></BaseNumberField.Increment>
    </BaseNumberField.Group></BaseNumberField.Root>
}

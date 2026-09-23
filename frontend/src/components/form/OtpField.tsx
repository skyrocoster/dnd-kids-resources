import { OTPField as BaseOtpField } from '@base-ui/react/otp-field'
import type { OTPFieldRootProps } from '@base-ui/react/otp-field'
import { useId } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import './advanced-form.css'
export interface OtpFieldProps extends Omit<OTPFieldRootProps, 'children' | 'className' | 'id' | 'onValueChange'> {
  label: ReactNode; description?: ReactNode; id?: string; onValueChange?: (value: string) => void
  slotAriaLabel?: (index: number, length: number) => string
  inputProps?: Omit<ComponentPropsWithoutRef<'input'>, 'aria-describedby' | 'aria-label' | 'defaultValue' | 'id' | 'maxLength' | 'value'>
  className?: string
}
export function OtpField({ label, description, id: idProp, length, onValueChange,
  slotAriaLabel = (i, n) => `Character ${i + 1} of ${n}`, inputProps, className, ...props }: OtpFieldProps) {
  const id = idProp ?? useId(); const descriptionId = description ? `${id}-description` : undefined
  return <div className={['form-advanced-otp', className].filter(Boolean).join(' ')}>
    <label className="form-advanced-label" htmlFor={id}>{label}</label>
    <BaseOtpField.Root {...props} id={id} length={length} aria-describedby={descriptionId} className="form-advanced-otp-root" onValueChange={v => onValueChange?.(v)}>
      {Array.from({ length }, (_, i) => <BaseOtpField.Input {...inputProps} key={i} className="form-advanced-otp-input"
        aria-describedby={descriptionId} aria-label={i === 0 ? undefined : slotAriaLabel(i, length)} />)}
    </BaseOtpField.Root>{description && <p className="form-advanced-description" id={descriptionId}>{description}</p>}
  </div>
}

import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Toggle } from './Toggle'
import './advanced-form.css'
export interface ToggleOptionDefinition { value: string; label: ReactNode; disabled?: boolean; ariaLabel?: string }
export interface ToggleGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange'> {
  options: readonly ToggleOptionDefinition[]; value?: readonly string[]; defaultValue?: readonly string[]
  onValueChange?: (value: string[]) => void; multiple?: boolean; disabled?: boolean
  orientation?: 'horizontal' | 'vertical'; loopFocus?: boolean
}
export function ToggleGroup({ options, value, defaultValue, onValueChange, multiple, disabled,
  orientation = 'horizontal', loopFocus, className, ...rest }: ToggleGroupProps) {
  return <BaseToggleGroup {...rest} className={['form-advanced-toggle-group', className].filter(Boolean).join(' ')}
    value={value} defaultValue={defaultValue} onValueChange={v => onValueChange?.(v)} multiple={multiple}
    disabled={disabled} orientation={orientation} loopFocus={loopFocus}>
    {options.map(o => <Toggle key={o.value} value={o.value} disabled={o.disabled} aria-label={o.ariaLabel}>{o.label}</Toggle>)}
  </BaseToggleGroup>
}

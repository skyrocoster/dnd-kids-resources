import { Form as BaseForm } from '@base-ui/react/form'
import type { FormProps as BaseFormProps } from '@base-ui/react/form'
import './advanced-form.css'
export type FormLayout = 'stacked' | 'inline' | 'plain'
export type FormProps<T extends Record<string, unknown> = Record<string, unknown>> = Omit<BaseFormProps<T>, 'className'> & { className?: string; layout?: FormLayout }
export function Form<T extends Record<string, unknown> = Record<string, unknown>>({ layout = 'stacked', className, ...rest }: FormProps<T>) {
  return <BaseForm<T> {...rest} className={['form-advanced', className].filter(Boolean).join(' ')} data-layout={layout} />
}

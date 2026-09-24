import { Field as BaseField } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import "./form.css";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  multiline?: false;
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  error?: string;
  multiline: true;
}

export function TextField(props: TextFieldProps | TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const { label, error, multiline, ...rest } = props;

  return (
    <BaseField.Root
      className="form-field"
      name={rest.name}
      disabled={rest.disabled}
      invalid={!!error}
    >
      <BaseField.Label htmlFor={id} className="form-label">
        {label}
      </BaseField.Label>
      {multiline ? (
        <textarea
          id={id}
          className="form-control form-textarea"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          id={id}
          className="form-control"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && (
        <BaseField.Error id={errorId} className="form-error" match={!!error}>
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
}

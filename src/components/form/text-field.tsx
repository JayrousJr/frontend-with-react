import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface TextFieldProps<T extends FieldValues> extends Omit<
  React.ComponentProps<typeof Input>,
  "name"
> {
  control: Control<T>
  name: Path<T>
  label: React.ReactNode
  /** Rendered on the right of the label row (e.g. a "forgot password?" link) */
  labelEnd?: React.ReactNode
}

/**
 * A react-hook-form-bound text input with label and inline validation error.
 * The standard form field for this template — see login-form.tsx and
 * signup-form.tsx for usage, and README "Forms" for the full pattern.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  labelEnd,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          {labelEnd ? (
            <div className="flex items-center">
              <FieldLabel htmlFor={name}>{label}</FieldLabel>
              {labelEnd}
            </div>
          ) : (
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
          )}
          <Input
            {...field}
            id={name}
            aria-invalid={fieldState.invalid || undefined}
            {...inputProps}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

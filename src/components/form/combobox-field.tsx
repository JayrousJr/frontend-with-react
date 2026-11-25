import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ComboboxSelect,
  type ComboboxSelectProps,
} from "@/components/ui/combobox-select"

interface ComboboxFieldProps<T extends FieldValues> extends Omit<
  ComboboxSelectProps,
  "value" | "onValueChange" | "name" | "id"
> {
  control: Control<T>
  name: Path<T>
  label: React.ReactNode
}

/**
 * A react-hook-form-bound select (Combobox) with label and inline validation
 * error — the select counterpart of `TextField`. Use this for every choice
 * field in forms instead of a native `<select>` or Radix `Select`.
 */
export function ComboboxField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  ...selectProps
}: ComboboxFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <ComboboxSelect
            {...selectProps}
            id={name}
            name={name}
            className={className ?? "w-full"}
            value={field.value as string | null | undefined}
            onValueChange={(value) => {
              field.onChange(value)
              field.onBlur()
            }}
            aria-invalid={fieldState.invalid || undefined}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

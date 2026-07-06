import type { FieldValues, UseFormSetError } from "react-hook-form"

/**
 * Surface a failed submit as the form's root error — backend messages are
 * already localized (via the x-lang header), so show them verbatim and only
 * fall back for non-Error throws. Render with:
 *
 *   <FieldError errors={[form.formState.errors.root]} />
 */
export function setRootError<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fallback: string
): void {
  setError("root", {
    message: error instanceof Error ? error.message : fallback,
  })
}

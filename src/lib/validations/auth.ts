import { z } from "zod"
import type { TFunction } from "i18next"

/**
 * Validation schemas are factories taking `t` so messages are localized with
 * the active language — build them inside the component with
 * `useMemo(() => createLoginSchema(t), [t])`.
 *
 * Rules mirror the backend so users aren't told "valid" locally only to be
 * rejected by the API.
 */

export function createLoginSchema(t: TFunction) {
  return z.object({
    email: z.email(t("validation.email")),
    password: z.string().min(1, t("validation.required")),
  })
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>

/**
 * New password (activation, reset, change). Mirrors the backend policy
 * defaults (SECURITY_PASSWORD_POLICY): ≥10 characters, a letter and a
 * number. Common-password, name/email and history checks run server-side.
 */
export function createNewPasswordSchema(t: TFunction, minLength = 10) {
  return z
    .object({
      password: z
        .string()
        .min(minLength, t("validation.password_min", { count: minLength }))
        .regex(
          /[A-Za-z]/,
          t("validation.password_letter_number", "Use letters and numbers")
        )
        .regex(
          /[0-9]/,
          t("validation.password_letter_number", "Use letters and numbers")
        ),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("auth.passwords_no_match"),
      path: ["confirmPassword"],
    })
}

export type NewPasswordValues = z.infer<
  ReturnType<typeof createNewPasswordSchema>
>

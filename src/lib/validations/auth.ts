import { z } from "zod"
import type { TFunction } from "i18next"

/**
 * Validation schemas are factories taking `t` so messages are localized with
 * the active language — build them inside the component with
 * `useMemo(() => createLoginSchema(t), [t])`.
 *
 * Rules mirror the backend DTOs (e.g. password MinLength(8) in
 * auth/dto/register.dto.ts) so users aren't told "valid" locally only to be
 * rejected by the API.
 */

export function createLoginSchema(t: TFunction) {
  return z.object({
    email: z.email(t("validation.email")),
    password: z.string().min(1, t("validation.required")),
  })
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      firstName: z.string().min(1, t("validation.required")),
      lastName: z.string().min(1, t("validation.required")),
      email: z.email(t("validation.email")),
      password: z.string().min(8, t("validation.password_min", { count: 8 })),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("auth.passwords_no_match"),
      path: ["confirmPassword"],
    })
}

export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { CheckCircle2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { TextField } from "@/components/form/text-field"
import { setRootError } from "@/lib/form"
import {
  createNewPasswordSchema,
  type NewPasswordValues,
} from "@/lib/validations/auth"
import { ROUTES } from "@/routes/routeConstants"

/**
 * Token + new password: account activation (first password) and password
 * reset share this screen; only the copy and the API call differ.
 */
export function SetPasswordForm({
  mode,
  submit,
}: {
  mode: "activate" | "reset"
  submit: (token: string, password: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get("token")
  const [done, setDone] = useState(false)
  const schema = useMemo(() => createNewPasswordSchema(t), [t])
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const copy =
    mode === "activate"
      ? {
          title: t("auth.activate_title", "Activate your account"),
          subtitle: t(
            "auth.activate_subtitle",
            "Choose the password you will use with your company email."
          ),
          submit: t("auth.activate_submit", "Activate account"),
          done: t(
            "auth.activate_done",
            "Your account is active. You can now log in."
          ),
          invalid: t(
            "auth.activate_invalid",
            "This activation link is invalid or has expired. Ask ICT to send a new one."
          ),
        }
      : {
          title: t("auth.reset_title", "Set a new password"),
          subtitle: t("auth.reset_subtitle", "Enter your new password below."),
          submit: t("auth.reset_submit", "Reset password"),
          done: t(
            "auth.reset_done",
            "Your password has been changed. Log in with the new password."
          ),
          invalid: t(
            "auth.reset_invalid",
            "This reset link is invalid or has expired. Request a new one."
          ),
        }

  async function onSubmit(values: NewPasswordValues) {
    try {
      await submit(token!, values.password)
      setDone(true)
    } catch (err) {
      setRootError(form.setError, err, t("general_error"))
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>
              {!token ? copy.invalid : done ? copy.done : copy.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token || done ? (
              <div className="flex flex-col gap-4">
                {done && (
                  <CheckCircle2Icon className="mx-auto size-10 text-emerald-600" />
                )}
                <Button asChild className="w-full">
                  <Link
                    to={
                      !token && mode === "reset"
                        ? ROUTES.FORGOT_PASSWORD
                        : ROUTES.LOGIN
                    }
                  >
                    {!token && mode === "reset"
                      ? t("auth.request_new_link", "Request a new link")
                      : t("auth.go_to_login", "Go to log in")}
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <TextField
                    control={form.control}
                    name="password"
                    label={t("auth.new_password", "New password")}
                    type="password"
                    autoComplete="new-password"
                  />
                  <FieldDescription>
                    {t(
                      "auth.password_rules",
                      "At least 10 characters with letters and numbers. Not a common password, not your name or email, and not one of your last 5 passwords."
                    )}
                  </FieldDescription>
                  <TextField
                    control={form.control}
                    name="confirmPassword"
                    label={t("auth.confirm_password", "Confirm password")}
                    type="password"
                    autoComplete="new-password"
                  />
                  <FieldError errors={[form.formState.errors.root]} />
                  <Field>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {copy.submit}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

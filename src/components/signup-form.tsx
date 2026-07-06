import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
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
  FieldSeparator,
} from "@/components/ui/field"
import { TextField } from "@/components/form/text-field"
import { register } from "@/services/auth"
import { setRootError } from "@/lib/form"
import {
  createRegisterSchema,
  type RegisterValues,
} from "@/lib/validations/auth"
import { ROUTES } from "@/routes/routeConstants"
import { cn } from "@/lib/utils"
import { logo } from "@/lib/exports"
import { API_URL } from "@/lib/api-url"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [success, setSuccess] = useState(false)
  const { t } = useTranslation()

  const schema = useMemo(() => createRegisterSchema(t), [t])
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: RegisterValues) {
    try {
      const res = await register(
        values.email,
        values.password,
        values.firstName,
        values.lastName
      )
      toast.success(res?.message)
      setSuccess(true)
    } catch (err) {
      setRootError(form.setError, err, t("auth.register_failed"))
    }
  }

  if (success) {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>{t("auth.email_verification_title")}</CardTitle>
          <CardDescription>
            {t("auth.email_verification_message")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={ROUTES.LOGIN}>
            <Button className="w-full">{t("auth.login")}</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6")} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  {t("auth.signup_message")}
                </h1>
                <p className="text-sm text-balance text-muted-foreground">
                  {t("auth.signup_sub_message")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  control={form.control}
                  name="firstName"
                  label={t("profile.first_name")}
                  placeholder="John"
                  autoComplete="given-name"
                />
                <TextField
                  control={form.control}
                  name="lastName"
                  label={t("profile.last_name")}
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>
              <TextField
                control={form.control}
                name="email"
                label={t("auth.email")}
                type="email"
                placeholder="johndoe@email.com"
                autoComplete="email"
              />
              <TextField
                control={form.control}
                name="password"
                label={t("auth.password")}
                type="password"
                autoComplete="new-password"
              />
              <TextField
                control={form.control}
                name="confirmPassword"
                label={t("auth.confirm_password")}
                type="password"
                autoComplete="new-password"
              />
              <FieldError errors={[form.formState.errors.root]} />
              <FieldGroup>
                <Field>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                      ? t("auth.creating")
                      : t("auth.signup")}
                  </Button>
                </Field>
              </FieldGroup>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {t("auth.social_login_message")}
              </FieldSeparator>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    window.location.href = `${API_URL}/auth/google`
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {t("auth.continue_with_google")}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                {t("auth.have_account")}{" "}
                <Link to={ROUTES.LOGIN}>{t("auth.login")}</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Link to={ROUTES.HOME}>
              <img
                src={logo}
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </Link>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {t("auth.terms_message")} <a href="#">{t("auth.terms")}</a> {t("and")}{" "}
        <a href="#">{t("auth.policy")}</a>.
      </FieldDescription>
    </div>
  )
}

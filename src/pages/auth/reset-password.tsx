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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/routes/routeConstants"
import { resetPassword } from "@/services/auth"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
} from "react-router"

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  try {
    await resetPassword(token, password)
    return redirect(ROUTES.LOGIN)
  } catch {
    return { error: "Invalid or expired reset link. Request a new one." }
  }
}

const ResetPasswordPage = () => {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [searchParams] = useSearchParams()

  const token = searchParams.get("token")
  const isSubmitting = navigation.state === "submitting"

  if (!token) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className={cn("flex flex-col gap-6")}>
            <Card>
              <CardHeader>
                <CardTitle>Invalid reset link</CardTitle>
                <CardDescription>
                  This link is invalid or has expired. Please request a new
                  password reset.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={ROUTES.FORGOT_PASSWORD}>
                  <Button className="w-full">Request new link</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6")}>
          <Card>
            <CardHeader>
              <CardTitle>Set new password</CardTitle>
              <CardDescription>Enter your new password below.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post">
                <input type="hidden" name="token" value={token} />
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">New Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                    />
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                    />
                  </Field>
                  {actionData?.error && (
                    <p className="text-sm text-destructive">
                      {actionData.error}
                    </p>
                  )}
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Reset password"}
                    </Button>
                    <FieldDescription className="text-center">
                      Remember your password?{" "}
                      <Link
                        to={ROUTES.LOGIN}
                        className="underline underline-offset-4"
                      >
                        Log In
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage

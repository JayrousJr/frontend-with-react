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
import { requestPasswordReset } from "@/services/auth"
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  type ActionFunctionArgs,
} from "react-router"

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const email = formData.get("email") as string

  try {
    await requestPasswordReset(email)
    return { success: true }
  } catch {
    return { success: false, error: "Could not send reset email. Try again." }
  }
}

const ForgotPasswordPage = () => {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  if (actionData?.success) {
    return (
      <div className="flex min-h-svh w-full justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div>Check your email for a password reset link.</div>
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
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email email below to reset password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="user@example.com"
                      required
                    />
                    {actionData?.error && (
                      <p className="text-sm text-destructive">
                        {actionData.error}
                      </p>
                    )}
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </Button>
                    <FieldDescription className="text-center">
                      Not sure what to do?{" "}
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

export default ForgotPasswordPage

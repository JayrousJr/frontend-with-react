import { SetPasswordForm } from "@/components/auth/set-password-form"
import { resetPassword } from "@/services/auth"

const ResetPasswordPage = () => (
  <SetPasswordForm mode="reset" submit={resetPassword} />
)

export default ResetPasswordPage

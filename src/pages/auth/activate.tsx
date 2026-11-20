import { SetPasswordForm } from "@/components/auth/set-password-form"
import { activateAccount } from "@/services/auth"

const ActivatePage = () => (
  <SetPasswordForm mode="activate" submit={activateAccount} />
)

export default ActivatePage

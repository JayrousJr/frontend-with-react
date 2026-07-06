import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { changePassword } from "@/services/account"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const PasswordTab = () => {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useTranslation()
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(`${t("password.password_match_error")}`)
      return
    }

    setIsSaving(true)
    try {
      const res = (await changePassword(currentPassword, newPassword)) as any

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success(res?.changePassword.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${t("general_error")}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("profile.password")}</CardTitle>
            <CardDescription>
              {t("password.change_password_message")}
            </CardDescription>
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? `${t("actions.updating")}` : `${t("actions.update")}`}
          </Button>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Separator />

            <div className="grid max-w-md gap-6">
              <Field>
                <FieldLabel> {t("password.current_password")}</FieldLabel>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>{t("password.new_password")}</FieldLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>{t("password.confirm_passsword")}</FieldLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  )
}

export default PasswordTab

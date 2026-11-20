import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import { TwoFactorSetupPanel } from "@/components/auth/two-factor-setup"
import { errorMessage } from "@/services/api"
import {
  beginTwoFactorSetup,
  disableTwoFactor,
  enableTwoFactor,
  fetchTwoFactorStatus,
  type TwoFactorSetup,
} from "@/services/auth"

export function TwoFactorCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<{
    enabled: boolean
    required: boolean
  } | null>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")

  const load = () => void fetchTwoFactorStatus().then(setStatus)
  useEffect(load, [])

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      toast.success(ok)
      setSetup(null)
      setDisabling(false)
      setPassword("")
      setCode("")
      load()
    } catch (err) {
      setError(errorMessage(err, t("general_error")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("twofa.title", "Two-factor sign-in")}
          {status && (
            <Badge variant={status.enabled ? "secondary" : "outline"}>
              {status.enabled ? t("common.on", "On") : t("common.off", "Off")}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status?.required
            ? t(
                "twofa.required_hint",
                "Required for one of your roles. If you lose your phone, ask ICT to reset it."
              )
            : t(
                "twofa.optional_hint",
                "Adds a code from an authenticator app when you log in."
              )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status && !status.enabled && !setup && (
          <Button
            disabled={busy}
            onClick={async () => {
              try {
                setSetup(await beginTwoFactorSetup())
              } catch (err) {
                setError(errorMessage(err, t("general_error")))
              }
            }}
          >
            {t("twofa.turn_on", "Turn on")}
          </Button>
        )}
        {setup && (
          <TwoFactorSetupPanel
            setup={setup}
            busy={busy}
            error={error}
            onConfirm={(c) =>
              act(
                () => enableTwoFactor(c),
                t("twofa.enabled", "Two-factor sign-in is on")
              )
            }
          />
        )}
        {status?.enabled && !status.required && !disabling && (
          <Button variant="outline" onClick={() => setDisabling(true)}>
            {t("twofa.turn_off", "Turn off")}
          </Button>
        )}
        {disabling && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="2fa-off-pw">
                {t("settings.current_password", "Current password")}
              </FieldLabel>
              <Input
                id="2fa-off-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="2fa-off-code">
                {t("twofa.code", "6-digit code")}
              </FieldLabel>
              <Input
                id="2fa-off-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDisabling(false)}>
                {t("actions.cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || !password || code.length < 6}
                onClick={() =>
                  act(
                    () => disableTwoFactor(password, code),
                    t("twofa.disabled", "Two-factor sign-in is off")
                  )
                }
              >
                {t("twofa.turn_off", "Turn off")}
              </Button>
            </div>
          </FieldGroup>
        )}
        {error && !setup && !disabling && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

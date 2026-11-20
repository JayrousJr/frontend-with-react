import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { errorMessage } from "@/services/api"
import {
  challengeEnable,
  challengeSetup,
  sendTwoFactorEmail,
  verifyTwoFactor,
  type TwoFactorChallenge,
  type TwoFactorSetup,
} from "@/services/auth"
import { TwoFactorSetupPanel } from "./two-factor-setup"

/**
 * Second login step. Either a code (authenticator or emailed), or — when a
 * role requires 2FA and the user hasn't enrolled — enrolment right here.
 */
export function TwoFactorStep({
  challenge,
  onDone,
  onCancel,
}: {
  challenge: TwoFactorChallenge
  onDone: (accessToken: string) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)

  async function attempt(fn: () => Promise<{ accessToken: string }>) {
    setBusy(true)
    setError(null)
    try {
      const { accessToken } = await fn()
      await onDone(accessToken)
    } catch (err) {
      setError(errorMessage(err, t("general_error")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldCheckIcon className="size-8 text-primary" />
        <h1 className="text-2xl font-bold">
          {challenge.setupRequired
            ? t("twofa.setup_title", "Set up two-factor sign-in")
            : t("twofa.title", "Two-factor sign-in")}
        </h1>
        <p className="text-balance text-muted-foreground">
          {challenge.setupRequired
            ? t(
                "twofa.setup_required",
                "One of your roles requires a second step when signing in."
              )
            : t(
                "twofa.enter_code",
                "Enter the code from your authenticator app."
              )}
        </p>
      </div>

      {challenge.setupRequired ? (
        setup ? (
          <TwoFactorSetupPanel
            setup={setup}
            busy={busy}
            error={error}
            onConfirm={(c) =>
              attempt(() => challengeEnable(challenge.challengeToken, c))
            }
          />
        ) : (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setSetup(await challengeSetup(challenge.challengeToken))
              } catch (err) {
                setError(errorMessage(err, t("general_error")))
              } finally {
                setBusy(false)
              }
            }}
          >
            {t("twofa.start_setup", "Start setup")}
          </Button>
        )
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void attempt(() => verifyTwoFactor(challenge.challengeToken, code))
          }}
        >
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="twofa-code">
              {t("twofa.code", "6-digit code")}
            </FieldLabel>
            <Input
              id="twofa-code"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
            />
            {error && (
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            )}
          </Field>
          <Button
            type="submit"
            disabled={busy || code.replace(/\s/g, "").length !== 6}
          >
            {t("twofa.verify", "Verify")}
          </Button>
          <Button
            type="button"
            variant="link"
            disabled={busy}
            onClick={async () => {
              try {
                await sendTwoFactorEmail(challenge.challengeToken)
                toast.success(
                  t(
                    "twofa.email_sent",
                    "A code was sent to your company email."
                  )
                )
              } catch (err) {
                setError(errorMessage(err, t("general_error")))
              }
            }}
          >
            {t("twofa.email_instead", "No phone? Email me a code")}
          </Button>
        </form>
      )}
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {t("twofa.back", "Back to log in")}
      </Button>
    </div>
  )
}

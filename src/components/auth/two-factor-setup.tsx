import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import type { TwoFactorSetup } from "@/services/auth"

/** Scan-or-type enrolment panel, then confirm with a first code. */
export function TwoFactorSetupPanel({
  setup,
  busy,
  error,
  onConfirm,
}: {
  setup: TwoFactorSetup
  busy?: boolean
  error?: string | null
  onConfirm: (code: string) => void
}) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState("")

  useEffect(() => {
    void QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 200 }).then(
      setQr
    )
  }, [setup.otpauthUri])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "twofa.setup_hint",
          "Scan the code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…), then enter the 6-digit code it shows."
        )}
      </p>
      <div className="flex flex-col items-center gap-2">
        {qr ? (
          <img
            src={qr}
            alt={t("twofa.qr_alt", "Authenticator QR code")}
            className="size-48 rounded-md border bg-white p-1"
          />
        ) : (
          <div className="size-48 animate-pulse rounded-md bg-muted" />
        )}
        <div className="text-center text-xs text-muted-foreground">
          {t("twofa.manual", "Or type this key:")}
          <div className="mt-1 font-mono text-sm tracking-wider break-all text-foreground select-all">
            {setup.secret.match(/.{1,4}/g)?.join(" ")}
          </div>
        </div>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm(code)
        }}
      >
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="twofa-setup-code">
            {t("twofa.code", "6-digit code")}
          </FieldLabel>
          <Input
            id="twofa-setup-code"
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
          {t("twofa.confirm", "Confirm and turn on")}
        </Button>
      </form>
    </div>
  )
}

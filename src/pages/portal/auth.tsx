import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { errorMessage } from "@/services/api"
import {
  portalActivate,
  portalLogin,
  portalSetup2fa,
  portalVerify2fa,
  setPortalToken,
} from "@/services/portal"

export function PortalShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh items-start justify-center bg-muted p-4 sm:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>AzamTV · {title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

/** Vendor sign-in: email + password, then the authenticator app (set up at first sign-in). */
export function PortalLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState<{
    token: string
    setup: boolean
  } | null>(null)
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(
    null
  )
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const done = (token: string) => {
    setPortalToken(token)
    navigate("/portal", { replace: true })
  }
  const step = async (e: FormEvent, fn: () => Promise<void>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err, t("general_error")))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (!challenge?.setup || setup) return
    void portalSetup2fa(challenge.token).then(async (s) =>
      setSetup({
        secret: s.secret,
        qr: await QRCode.toDataURL(s.otpauthUrl, { margin: 1, width: 180 }),
      })
    )
  }, [challenge, setup])
  return (
    <PortalShell
      title={t("portal.title", "Vendor portal")}
      description={t(
        "portal.login_hint",
        "Sign in with the account AzamTV Procurement (or your vendor administrator) created for you."
      )}
    >
      {!challenge ? (
        <form
          className="space-y-3"
          onSubmit={(e) =>
            step(e, async () => {
              const r = await portalLogin(email, password)
              if (r.tokens) done(r.tokens.accessToken)
              else if (r.challenge)
                setChallenge({
                  token: r.challenge.challengeToken,
                  setup: r.challenge.setupRequired,
                })
            })
          }
        >
          <Field>
            <FieldLabel htmlFor="pl-e">{t("auth.email", "Email")}</FieldLabel>
            <Input
              id="pl-e"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pl-p">
              {t("auth.password", "Password")}
            </FieldLabel>
            <Input
              id="pl-p"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !email || !password}
          >
            {t("auth.sign_in", "Sign in")}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) =>
            step(e, async () =>
              done((await portalVerify2fa(challenge.token, code)).accessToken)
            )
          }
        >
          {challenge.setup ? (
            <>
              <p className="text-sm">
                {t(
                  "portal.setup_2fa",
                  "Two-step sign-in is mandatory. Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator…), then enter the 6-digit code."
                )}
              </p>
              {setup && (
                <div className="flex flex-col items-center gap-2">
                  <img src={setup.qr} alt="" className="size-44" />
                  <code className="text-xs break-all">{setup.secret}</code>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm">
              {t(
                "portal.enter_code",
                "Enter the 6-digit code from your authenticator app."
              )}
            </p>
          )}
          <Input
            id="twofa-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || code.length !== 6}
          >
            {t("auth.verify", "Verify")}
          </Button>
        </form>
      )}
    </PortalShell>
  )
}

export function PortalActivatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { uniqueId: token = "" } = useParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <PortalShell
      title={t("portal.activate", "Set your password")}
      description={t(
        "portal.activate_hint",
        "At least 10 characters with letters and numbers. You will set up an authenticator app at first sign-in."
      )}
    >
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await portalActivate(token, password)
            navigate("/portal/login", { replace: true })
          } catch (err) {
            setError(errorMessage(err, t("general_error")))
          } finally {
            setBusy(false)
          }
        }}
      >
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.password", "Password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.confirm_password", "Confirm password")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          className="w-full"
          disabled={busy || password.length < 8 || password !== confirm}
        >
          {t("portal.set_password", "Set password")}
        </Button>
      </form>
    </PortalShell>
  )
}

import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import LoadingPage from "@/components/loading-page"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { ROUTES } from "@/routes/routeConstants"
import { useTranslation } from "react-i18next"

/**
 * Lands the browser after an OAuth provider round-trip. The backend puts
 * tokens (or an error) in the URL fragment — fragments never hit server logs
 * or Referer headers — and this page trades them for a session.
 */
const OauthCallback = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Read the fragment once, synchronously, before anything can re-render.
  const [tokens] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    return {
      accessToken: params.get("accessToken"),
      refreshToken: params.get("refreshToken"),
    }
  })
  const [failed, setFailed] = useState(
    !tokens.accessToken || !tokens.refreshToken
  )
  const handled = useRef(false)

  useEffect(() => {
    // Scrub the tokens out of the address bar and browser history.
    window.history.replaceState(null, "", window.location.pathname)

    if (handled.current || !tokens.accessToken || !tokens.refreshToken) return
    handled.current = true

    login(tokens.accessToken, tokens.refreshToken)
      .then(() => navigate(ROUTES.DASHBOARD, { replace: true }))
      .catch(() => setFailed(true))
  }, [login, navigate, tokens])

  if (failed) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold">{t("auth.oauth_failed")}</h1>
        <p className="text-muted-foreground">
          {t("auth.oauth_failed_message")}
        </p>
        <Button asChild>
          <Link to={ROUTES.LOGIN}>{t("auth.login")}</Link>
        </Button>
      </div>
    )
  }

  return <LoadingPage />
}

export default OauthCallback

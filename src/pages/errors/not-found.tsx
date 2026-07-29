import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import LoadingPage from "@/components/loading-page"
import { Seo } from "@/components/seo"
import { ROUTES } from "@/routes/routeConstants"
import { resolveRedirect } from "@/services/content"

const NotFoundPage = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    // A 404 is often just a URL that moved: consult the backend's redirect map
    // before showing an error, so renamed slugs keep working (and keep the
    // ranking the old URL earned).
    resolveRedirect(pathname)
      .then((redirect) => {
        if (!active) return
        if (redirect) navigate(redirect.toPath, { replace: true })
        else setChecking(false)
      })
      .catch(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [pathname, navigate])

  if (checking) return <LoadingPage />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {/* Soft 404s must never be indexed. */}
      <Seo title="404" noindex />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        to={ROUTES.HOME}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Go home
      </Link>
    </div>
  )
}

export default NotFoundPage

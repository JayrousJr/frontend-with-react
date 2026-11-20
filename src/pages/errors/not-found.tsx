import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Seo } from "@/components/seo"
import { ROUTES } from "@/routes/routeConstants"

const NotFoundPage = () => {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <Seo title="404" noindex />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        {t(
          "errors.not_found_page",
          "The page you're looking for doesn't exist."
        )}
      </p>
      <Link
        to={ROUTES.DASHBOARD}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        {t("errors.go_home", "Go to the dashboard")}
      </Link>
    </div>
  )
}

export default NotFoundPage

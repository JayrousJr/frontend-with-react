import { Link } from "react-router"
import { ROUTES } from "@/routes/routeConstants"

const ForbiddenPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">403</h1>
      <p className="text-muted-foreground">
        You don&apos;t have permission to view this page.
      </p>
      <Link
        to={ROUTES.DASHBOARD}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Go home
      </Link>
    </div>
  )
}

export default ForbiddenPage

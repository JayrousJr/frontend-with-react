import LoadingPage from "@/components/loading-page"
import { useAuth } from "@/context/auth-context"
import { Navigate, Outlet } from "react-router"
import { ROUTES } from "./routeConstants"

const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <LoadingPage />

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute

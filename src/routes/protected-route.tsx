import LoadingPage from "@/components/loading-page"
import { useAuth } from "@/context/auth-context"
import { Navigate, Outlet, useLocation } from "react-router"
import { ROUTES } from "./routeConstants"

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingPage />

  if (!isAuthenticated) {
    // Remember where the user was going; the login page sends them back.
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return <Outlet />
}

export default ProtectedRoute

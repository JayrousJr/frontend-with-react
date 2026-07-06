import LoadingPage from "@/components/loading-page"
import { useAuth, type UserRole } from "@/context/auth-context"
import { Navigate, Outlet } from "react-router"
import { ROUTES } from "./routeConstants"

type RoleRouteProps = {
  allowedRoles: UserRole[]
}

const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingPage />

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />
  }

  return <Outlet />
}

export default RoleRoute

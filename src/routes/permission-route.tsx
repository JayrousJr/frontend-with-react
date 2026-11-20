import LoadingPage from "@/components/loading-page"
import { useAuth, type Permission } from "@/context/auth-context"
import { hasAnyPermission, hasEveryPermission } from "@/lib/permissions"
import { Navigate, Outlet } from "react-router"
import { ROUTES } from "./routeConstants"

type PermissionRouteProps = {
  /** All of these are required. */
  requiredPermissions?: Permission[]
  /** At least one of these is required. */
  anyPermissions?: Permission[]
}

/**
 * Page-level permission gate — redirects to /403 unless the user holds every
 * permission in requiredPermissions (with any scope), mirroring the backend
 * PermissionsGuard. Nest inside ProtectedRoute so auth is checked first.
 * There is no admin bypass: like the backend, this checks permissions only,
 * never role names.
 */
const PermissionRoute = ({
  requiredPermissions = [],
  anyPermissions,
}: PermissionRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingPage />

  if (
    !hasEveryPermission(user, requiredPermissions) ||
    (anyPermissions && !hasAnyPermission(user, anyPermissions))
  ) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />
  }

  return <Outlet />
}

export default PermissionRoute

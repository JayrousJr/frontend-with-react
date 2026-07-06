import LoadingPage from "@/components/loading-page"
import { useAuth, type Permission } from "@/context/auth-context"
import { hasEveryPermission } from "@/lib/permissions"
import { Navigate, Outlet } from "react-router"
import { ROUTES } from "./routeConstants"

type PermissionRouteProps = {
  requiredPermissions: Permission[]
}

/**
 * Page-level permission gate — redirects to /403 unless the user holds every
 * permission in requiredPermissions (the admin role bypasses the check,
 * mirroring the backend PermissionsGuard). Nest inside ProtectedRoute (and,
 * where relevant, RoleRoute) so auth and role are checked first — same
 * composition pattern, just a finer-grained axis.
 */
const PermissionRoute = ({ requiredPermissions }: PermissionRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingPage />

  if (!hasEveryPermission(user, requiredPermissions)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />
  }

  return <Outlet />
}

export default PermissionRoute

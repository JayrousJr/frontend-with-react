import { useAuth, type Permission } from "@/context/auth-context"
import { hasEveryPermission } from "@/lib/permissions"
import type { ComponentType } from "react"

/**
 * Renders the component only if the current user holds every permission in
 * requiredPermissions (any scope; no admin bypass, mirroring the backend
 * guard). Returns null otherwise — no redirect, no error, just hidden.
 *
 * Use this for inline UI elements (buttons, menu items, sections).
 * For page-level access control use PermissionRoute in the router instead.
 *
 * @example
 * const DeleteButton = withPermission(["user.manage"])(Button)
 * const ExportAction = withPermission(["audit.view"])(MenuItem)
 */
export function withPermission<TProps extends object>(
  requiredPermissions: Permission[]
) {
  return function (Component: ComponentType<TProps>) {
    const WithPermission = (props: TProps) => {
      const { user } = useAuth()

      if (!hasEveryPermission(user, requiredPermissions)) {
        return null
      }

      return <Component {...props} />
    }

    WithPermission.displayName = `withPermission(${Component.displayName ?? Component.name})`

    return WithPermission
  }
}

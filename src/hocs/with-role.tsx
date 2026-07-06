import { useAuth, type UserRole } from "@/context/auth-context"
import type { ComponentType } from "react"

/**
 * Renders the component only if the current user has one of the allowed roles.
 * Returns null otherwise — no redirect, no error, just hidden.
 *
 * Use this for inline UI elements (buttons, menu items, sections).
 * For page-level access control use RoleRoute in the router instead.
 *
 * @example
 * const AdminButton = withRole(["admin"])(Button)
 * const ManagerAction = withRole(["admin", "manager"])(DropdownItem)
 */
export function withRole<TProps extends object>(allowedRoles: UserRole[]) {
  return function (Component: ComponentType<TProps>) {
    const WithRole = (props: TProps) => {
      const { user } = useAuth()

      if (!user || !allowedRoles.includes(user.role)) {
        return null
      }

      return <Component {...props} />
    }

    WithRole.displayName = `withRole(${Component.displayName ?? Component.name})`

    return WithRole
  }
}

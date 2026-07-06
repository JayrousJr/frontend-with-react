import type { Permission, User } from "@/context/auth-context"

/**
 * Frontend mirror of the backend permission catalog
 * (backend: src/permissions/permission.constants.ts). Use these constants
 * instead of magic strings when gating routes or UI.
 */
export const PERMISSIONS = {
  USERS: {
    CREATE: "users.create",
    READ: "users.read",
    UPDATE: "users.update",
    DELETE: "users.delete",
  },
  ROLES: {
    READ: "roles.read",
    MANAGE: "roles.manage",
  },
  PERMISSIONS: {
    READ: "permissions.read",
    MANAGE: "permissions.manage",
  },
  CAMPAIGNS: {
    READ: "campaigns.read",
    MANAGE: "campaigns.manage",
  },
  NEWSLETTER: {
    READ: "newsletter.read",
  },
  FILES: {
    READ: "files.read",
    DELETE: "files.delete",
  },
  ANALYTICS: {
    READ: "analytics.read",
  },
} as const

/**
 * Membership check mirroring the backend PermissionsGuard: the admin role
 * bypasses permission checks entirely, everyone else must hold the permission.
 */
export function hasPermission(
  user: User | null,
  permission: Permission
): boolean {
  if (!user) return false
  if (user.role === "admin") return true
  return user.permissions.includes(permission)
}

export function hasEveryPermission(
  user: User | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission))
}

/** Group flat permission names by their domain prefix (e.g. "users"). */
export function groupPermissionsByDomain<T extends { name: string }>(
  permissions: T[]
): Record<string, T[]> {
  return permissions.reduce<Record<string, T[]>>((groups, permission) => {
    const domain = permission.name.split(".")[0] ?? "other"
    ;(groups[domain] ??= []).push(permission)
    return groups
  }, {})
}

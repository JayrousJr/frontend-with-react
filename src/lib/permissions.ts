import type { Permission, Scope, User } from "@/context/auth-context"

/**
 * Frontend mirror of the backend permission catalogue
 * (backend: src/access/catalogue). Use these constants instead of magic
 * strings when gating routes or UI. Add each module's codes as it is built.
 */
export const P = {
  DEPARTMENT_VIEW: "department.view",
  DEPARTMENT_MANAGE: "department.manage",
  JOB_TITLE_MANAGE: "job_title.manage",
  EMPLOYMENT_TYPE_MANAGE: "employment_type.manage",
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_VIEW_PERSONAL: "employee.view_personal",
  EMPLOYEE_MANAGE: "employee.manage",
  EMPLOYEE_IMPORT: "employee.import",
  EMPLOYEE_EXIT: "employee.exit",
  DRIVER_PROFILE_MANAGE: "driver_profile.manage",
  USER_VIEW: "user.view",
  USER_MANAGE: "user.manage",
  USER_ASSIGN_ROLE: "user.assign_role",
  USER_RESET_PASSWORD: "user.reset_password",
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",
  GROUP_MANAGE: "group.manage",
  POLICY_VIEW: "policy.view",
  POLICY_MANAGE: "policy.manage",
  AUDIT_VIEW: "audit.view",
  DELEGATION_CREATE: "delegation.create",
  DELEGATION_APPROVE: "delegation.approve",
  WORKFLOW_VIEW: "workflow.view",
  WORKFLOW_MANAGE: "workflow.manage",
  WORKFLOW_ACTIVATE: "workflow.activate",
  EXIT_CLEARANCE_APPROVE: "employee.exit_clearance.approve",
  SECURITY_VIEW_LOGINS: "security.view_logins",
  // B1 — Product Repository
  ITEM_VIEW: "item.view",
  ITEM_CREATE: "item.create",
  ITEM_EDIT_DRAFT: "item.edit_draft",
  ITEM_SUBMIT: "item.submit",
  ITEM_IMPORT: "item.import",
  ITEM_APPROVE: "item.approve",
  ITEM_MANAGE: "item.manage",
  ITEM_MERGE: "item.merge",
  ITEM_CATEGORY_MANAGE: "item_category.manage",
  // B2 — Store & Inventory
  STORE_MANAGE: "store.manage",
  STOCK_VIEW: "stock.view",
  STOCK_ISSUE: "stock.issue",
  STOCK_ADJUST: "stock.adjust",
  STOCK_ADJUSTMENT_APPROVE: "stock_adjustment.approve",
  ASSET_VIEW: "asset.view",
  ASSET_EDIT: "asset.edit",
  ASSET_TAG_PRINT: "asset.tag_print",
} as const

/**
 * Whether the user holds the permission with any scope. The backend still
 * checks the scope against every record; this only decides what to show.
 * No admin bypass — permissions are the foundation, never role names.
 */
export function hasPermission(
  user: User | null,
  permission: Permission
): boolean {
  if (!user) return false
  return user.permissions.includes(permission)
}

export function hasEveryPermission(
  user: User | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission))
}

export function hasAnyPermission(
  user: User | null,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}

/** Scopes the user holds for a permission (e.g. to hide a department filter). */
export function scopesFor(user: User | null, permission: Permission): Scope[] {
  if (!user) return []
  return [
    ...new Set(
      user.grants.filter((g) => g.permission === permission).map((g) => g.scope)
    ),
  ]
}

/** Group flat permission codes by module, keeping order. */
export function groupByModule<T extends { module: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    ;(groups[item.module] ??= []).push(item)
    return groups
  }, {})
}

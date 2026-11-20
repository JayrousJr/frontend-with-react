export const ROUTES = {
  // Authentication (full paths for navigation / API)
  LOGIN: "/auth/login",
  ACTIVATE: "/auth/activate",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",

  HOME: "/",
  DASHBOARD: "/dashboard",
  SETTINGS: "/settings",
  DELEGATIONS: "/delegations",

  // A1 — organisation & people
  DEPARTMENTS: "/organisation/departments",
  LOOKUPS: "/organisation/lists",
  EMPLOYEES: "/employees",
  EMPLOYEE_DETAILS: "/employees/:uniqueId",

  // A1 — access administration
  USERS: "/admin/users",
  USER_DETAILS: "/admin/users/:uniqueId",
  ROLES: "/admin/roles",
  ROLE_DETAILS: "/admin/roles/:uniqueId",
  GROUPS: "/admin/groups",
  POLICIES: "/admin/policies",
  AUDIT_LOG: "/admin/audit",

  // Error
  NOT_FOUND: "/404",
  FORBIDDEN: "/403",
}

/** Build a path for a route with a :uniqueId segment. */
export const withId = (route: string, uniqueId: string) =>
  route.replace(":uniqueId", uniqueId)

/**
 * Relative segments used inside the nested `path: "auth"` route group.
 */
export const AUTH_ROUTES = {
  LOGIN: "login",
  ACTIVATE: "activate",
  FORGOT_PASSWORD: "forgot-password",
  RESET_PASSWORD: "reset-password",
}

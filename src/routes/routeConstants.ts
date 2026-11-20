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
  APPROVALS: "/approvals",
  REPORTS: "/reports",
  APPROVAL_DETAILS: "/approvals/:uniqueId",
  EXIT_CLEARANCES: "/exit-clearances",
  EXIT_CLEARANCE_DETAILS: "/exit-clearances/:uniqueId",

  // A1 — organisation & people
  DEPARTMENTS: "/organisation/departments",
  LOOKUPS: "/organisation/lists",
  EMPLOYEES: "/employees",
  EMPLOYEE_IMPORT: "/employees/import",
  EMPLOYEE_DETAILS: "/employees/:uniqueId",

  // A1 — access administration
  USERS: "/admin/users",
  USER_DETAILS: "/admin/users/:uniqueId",
  ROLES: "/admin/roles",
  ROLE_DETAILS: "/admin/roles/:uniqueId",
  GROUPS: "/admin/groups",
  POLICIES: "/admin/policies",
  AUDIT_LOG: "/admin/audit",
  WORKFLOWS: "/admin/workflows",
  /** :uniqueId carries the approval point code. */
  WORKFLOW_DETAILS: "/admin/workflows/:uniqueId",

  // B1 — Product Repository
  PRODUCTS: "/products",
  PRODUCT_NEW: "/products/new",
  PRODUCT_IMPORT: "/products/import",
  PRODUCT_CATEGORIES: "/products/categories",
  PRODUCT_DETAILS: "/products/:uniqueId",
  PRODUCT_EDIT: "/products/:uniqueId/edit",

  // B2 — Store & Inventory
  STORES: "/store/stores",
  STORE_DETAILS: "/store/stores/:uniqueId",
  STOCK: "/store/stock",
  ASSETS: "/store/assets",
  ASSET_DETAILS: "/store/assets/:uniqueId",
  ASSET_TAGS: "/store/tags",
  ADJUSTMENTS: "/store/adjustments",
  ADJUSTMENT_NEW: "/store/adjustments/new",
  ADJUSTMENT_DETAILS: "/store/adjustments/:uniqueId",
  OPENING_BALANCE: "/store/opening-balance",

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

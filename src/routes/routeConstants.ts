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
  TRANSFERS: "/store/transfers",
  TRANSFER_NEW: "/store/transfers/new",
  TRANSFER_DETAILS: "/store/transfers/:uniqueId",
  ISSUES: "/store/issues",
  ISSUE_NEW: "/store/issues/new",
  ISSUE_DETAILS: "/store/issues/:uniqueId",
  COUNTS: "/store/counts",
  COUNT_DETAILS: "/store/counts/:uniqueId",
  MAINTENANCE: "/store/maintenance",
  MAINTENANCE_DETAILS: "/store/maintenance/:uniqueId",
  DISPOSALS: "/store/disposals",
  DISPOSAL_DETAILS: "/store/disposals/:uniqueId",

  // B1 §6 — Requests
  INTERNAL_REQUESTS: "/requests/internal",
  INTERNAL_REQUEST_NEW: "/requests/internal/new",
  INTERNAL_REQUEST_DETAILS: "/requests/internal/:uniqueId",
  PURCHASE_REQUESTS: "/requests/purchase",
  PURCHASE_REQUEST_NEW: "/requests/purchase/new",
  PURCHASE_REQUEST_DETAILS: "/requests/purchase/:uniqueId",

  // B3 — Handover & custody
  MY_ITEMS: "/my-items",
  CUSTODY: "/custody",
  HANDOVERS: "/custody/handovers",
  HANDOVER_NEW: "/custody/handovers/new",
  HANDOVER_DETAILS: "/custody/handovers/:uniqueId",
  RETURNS: "/custody/returns",
  CUSTODY_REPORTS: "/custody/reports",
  CUSTODY_TRANSFERS: "/custody/transfers",
  INSPECTIONS: "/custody/inspections",
  HANDOVER_ACK: "/handover-ack/:uniqueId",
  VENDORS: "/procurement/vendors",
  VENDOR_DETAILS: "/procurement/vendors/:uniqueId",
  PURCHASING: "/procurement/queue",
  TENDERS: "/tenders",
  TENDER_DETAILS: "/tenders/:uniqueId",
  ORDERS: "/procurement/orders",
  ORDER_DETAILS: "/procurement/orders/:uniqueId",
  GRNS: "/procurement/grns",
  GRN_DETAILS: "/procurement/grns/:uniqueId",
  GOODS_INSPECTIONS: "/procurement/inspections",
  GOODS_INSPECTION_DETAILS: "/procurement/inspections/:uniqueId",
  INVOICES: "/procurement/invoices",
  INVOICE_DETAILS: "/procurement/invoices/:uniqueId",
  PORTAL: "/portal",
  // Production 01–15
  PRODUCTIONS: "/productions",
  PRODUCTION_NEW: "/productions/new",
  PRODUCTION_EDIT: "/productions/:uniqueId/edit",
  PRODUCTION_DETAILS: "/productions/:uniqueId",
  CALL_SHEET: "/productions/:uniqueId/call-sheet",
  PRODUCTION_PACK: "/productions/:uniqueId/documents",
  BADGES: "/productions/:uniqueId/badges",
  PRODUCTION_CALENDAR: "/production-calendar",
  MY_PRODUCTIONS: "/my-productions",
  EQUIPMENT_BOOKINGS: "/equipment-bookings",
  EQUIPMENT_BOOKING_DETAILS: "/equipment-bookings/:uniqueId",
  TRANSPORT: "/transport",
  TRANSPORT_DETAILS: "/transport/:uniqueId",
  PRODUCTION_DOCUMENTS: "/production-documents",
  ANNOUNCEMENTS: "/announcements",
  PRODUCTION_MONITOR: "/production-monitor",
  MANAGEMENT_DASHBOARD: "/management-dashboard",
  STAFF_UNAVAILABILITY: "/staff-unavailability",
  CREW_OVERVIEW: "/crew-overview",
  PRODUCTION_SETTINGS: "/production-settings",
  ATTENDANCE: "/attendance",
  // Shared services
  NOTIFICATION_SETTINGS: "/notification-settings",
  EMAIL_LOG: "/admin/email-log",
  NOTIFICATION_TEMPLATES: "/admin/notification-texts",
  DASHBOARD_WIDGETS: "/admin/dashboard-sections",
  DOCUMENTS: "/documents",

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

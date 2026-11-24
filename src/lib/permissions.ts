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
  INTERNAL_REQUEST_VIEW: "internal_request.view",
  INTERNAL_REQUEST_CREATE: "internal_request.create",
  INTERNAL_REQUEST_FULFIL: "internal_request.fulfil",
  VENDOR_VIEW: "vendor.view",
  VENDOR_MANAGE: "vendor.manage",
  VENDOR_SUSPEND: "vendor.suspend",
  VENDOR_CREATE_ADMIN: "vendor.create_admin_user",
  VENDOR_RESET_2FA: "vendor.reset_2fa",
  ASSIGN_ROUTE: "purchase_request.assign_route",
  TENDER_VIEW: "tender.view",
  TENDER_CREATE: "tender.create",
  TENDER_PUBLISH: "tender.publish",
  LPO_VIEW: "lpo.view",
  LPO_CREATE: "lpo.create",
  CASH_PURCHASE: "cash_purchase.record",
  GRN_VIEW: "grn.view",
  STOCK_RECEIVE: "stock.receive",
  INSPECTION_VIEW: "inspection.view",
  INSPECTION_PERFORM: "inspection.perform",
  INVOICE_VIEW: "invoice.view",
  INVOICE_REGISTER: "invoice.register",
  PAYMENT_RECORD: "payment.record",
  PURCHASE_FILE_VIEW: "purchase_file.view",
  PROC_DOC_UPLOAD: "procurement_document.upload",
  PURCHASE_REQUEST_VIEW: "purchase_request.view",
  PURCHASE_REQUEST_CREATE: "purchase_request.create",
  // B3 — Handover & custody
  HANDOVER_VIEW: "handover.view",
  HANDOVER_PREPARE: "handover.prepare",
  HANDOVER_ACKNOWLEDGE: "handover.acknowledge",
  CUSTODY_VIEW: "custody.view",
  CUSTODY_TRANSFER_REQUEST: "custody_transfer.request",
  RETURN_REQUEST: "return.request",
  RETURN_RECEIVE: "return.receive",
  ASSET_INSPECTION: "asset_inspection.perform",
  ASSET_REPORT_CREATE: "asset_report.create",
  CUSTODY_RECALL: "custody.recall",
  // B2 — Store & Inventory
  STORE_MANAGE: "store.manage",
  STOCK_VIEW: "stock.view",
  STOCK_ISSUE: "stock.issue",
  STOCK_RETURN: "stock.return",
  TRANSFER_CREATE: "transfer.create",
  TRANSFER_DISPATCH: "transfer.dispatch",
  TRANSFER_RECEIVE: "transfer.receive",
  STOCK_ADJUST: "stock.adjust",
  STOCK_ADJUSTMENT_APPROVE: "stock_adjustment.approve",
  STOCK_COUNT_CREATE: "stock_count.create",
  STOCK_COUNT_COUNT: "stock_count.count",
  STOCK_COUNT_APPROVE: "stock_count.approve",
  MAINTENANCE_CREATE: "maintenance.create",
  MAINTENANCE_UPDATE: "maintenance.update",
  DISPOSAL_PROPOSE: "disposal.propose",
  DISPOSAL_APPROVE: "disposal.approve",
  ASSET_VIEW: "asset.view",
  ASSET_EDIT: "asset.edit",
  ASSET_TAG_PRINT: "asset.tag_print",
  // Production 01–15
  PRODUCTION_VIEW: "production.view",
  PRODUCTION_CREATE: "production_request.create",
  PRODUCTION_APPROVE: "production_request.approve",
  PRODUCTION_CONFIG: "production.config",
  PRODUCTION_CALENDAR: "production.calendar",
  SCHEDULE_MANAGE: "production_schedule.manage",
  UNAVAILABILITY_MANAGE: "staff_unavailability.manage",
  CREW_ASSIGN: "crew.assign",
  CREW_APPROVE_ADDITIONAL: "crew.approve_additional",
  BOOKING_VIEW: "equipment_booking.view",
  BOOKING_CREATE: "equipment_booking.create",
  BOOKING_CONFIRM: "equipment_booking.confirm",
  BOOKING_CHECKOUT: "equipment_booking.checkout",
  BOOKING_RETURN: "equipment_booking.return",
  RUNNING_ORDER_EDIT: "running_order.edit",
  TRANSPORT_REQUEST: "transport.request",
  TRANSPORT_ALLOCATE: "transport.allocate",
  TRANSPORT_TRIP: "transport.trip_record",
  TRANSPORT_VIEW: "transport.view",
  PRODUCTION_DOC_UPLOAD: "production_document.upload",
  ANNOUNCEMENT_SEND: "announcement.send",
  READINESS_UPDATE: "readiness.update",
  PRODUCTION_EXECUTE: "production.execute",
  PRODUCTION_REPORT: "production.report",
  PRODUCTION_CLOSE: "production.close",
  DASHBOARD_VIEW: "management_dashboard.view",
  ATTENDANCE_RECORD: "attendance.record",
  ATTENDANCE_VIEW: "attendance.view",
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

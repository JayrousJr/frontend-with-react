import type { ComponentType } from "react"
import { createBrowserRouter, Navigate } from "react-router"
import AuthLayout from "@/layouts/auth-layout"
import DashboardLayout from "@/layouts/dashboard-layout"
import { P } from "@/lib/permissions"
import { fetchDepartments, fetchLookups } from "@/services/org"
import { fetchEmployee, fetchEmployees } from "@/services/employees"
import { fetchUser, fetchUsers } from "@/services/users"
import {
  fetchGroups,
  fetchPermissionCatalogue,
  fetchRole,
  fetchRoles,
} from "@/services/access"
import { fetchPolicySettings } from "@/services/admin"
import { fetchReports } from "@/services/reports"
import {
  fetchApprovalPoint,
  fetchApprovalPoints,
  fetchApprovalRequest,
  fetchExitClearance,
  fetchExitClearances,
} from "@/services/workflow"
import {
  fetchCategories,
  fetchProduct,
  fetchProducts,
  type ProductStatus,
} from "@/services/products"
import {
  fetchAdjustment,
  fetchAdjustments,
  fetchAsset,
  fetchAssets,
  fetchCount,
  fetchCounts,
  fetchDisposal,
  fetchDisposals,
  fetchTicket,
  fetchTickets,
  fetchStockDocument,
  fetchStockDocuments,
  fetchStockLevels,
  fetchTransfer,
  fetchTransfers,
  fetchStore,
  fetchStores,
  type AssetStatus,
} from "@/services/store"
import { AUTH_ROUTES, ROUTES } from "./routeConstants"
import ProtectedRoute from "./protected-route"
import PublicOnlyRoute from "./public-only-route"
import PermissionRoute from "./permission-route"
import RouterErrorBoundary from "./router-error-boundary"

async function lazyPage(importFn: () => Promise<{ default: ComponentType }>) {
  const mod = await importFn()
  return { Component: mod.default }
}

const page = (url: string) => new URL(url).searchParams

const pageInput = (params: URLSearchParams) => ({
  page: Number(params.get("page") ?? "1"),
  limit: Number(params.get("limit") ?? "20"),
})

export const routes = createBrowserRouter([
  /** Root: straight to the dashboard (or login, via ProtectedRoute). */
  { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },

  /** Auth routes — blocked for authenticated users */
  {
    path: "auth",
    Component: PublicOnlyRoute,
    errorElement: <RouterErrorBoundary />,
    handle: { seo: { noindex: true } },
    children: [
      {
        Component: AuthLayout,
        children: [
          {
            path: AUTH_ROUTES.LOGIN,
            lazy: () => lazyPage(() => import("@/pages/auth/login")),
          },
          {
            path: AUTH_ROUTES.ACTIVATE,
            lazy: () => lazyPage(() => import("@/pages/auth/activate")),
          },
          {
            path: AUTH_ROUTES.FORGOT_PASSWORD,
            lazy: async () => {
              const { default: Component, action } =
                await import("@/pages/auth/forgot-password")
              return { Component, action }
            },
          },
          {
            path: AUTH_ROUTES.RESET_PASSWORD,
            lazy: () => lazyPage(() => import("@/pages/auth/reset-password")),
          },
        ],
      },
    ],
  },

  /** Protected routes (auth required) */
  {
    Component: ProtectedRoute,
    errorElement: <RouterErrorBoundary />,
    handle: { seo: { noindex: true } },
    children: [
      {
        Component: DashboardLayout,
        children: [
          {
            path: ROUTES.DASHBOARD,
            lazy: () => lazyPage(() => import("@/pages/dashboard/dashboard")),
          },
          {
            path: ROUTES.SETTINGS,
            lazy: () =>
              lazyPage(() => import("@/pages/dashboard/settings/settings")),
          },

          {
            element: (
              <PermissionRoute
                anyPermissions={[P.DELEGATION_CREATE, P.DELEGATION_APPROVE]}
              />
            ),
            children: [
              {
                path: ROUTES.DELEGATIONS,
                lazy: () =>
                  lazyPage(() => import("@/pages/delegations/delegations")),
              },
            ],
          },

          // ── Approvals (assignment is checked by the API) ───────────────
          {
            // Lists only the reports the user's permissions allow.
            path: ROUTES.REPORTS,
            loader: async () => ({ reports: await fetchReports() }),
            lazy: () => lazyPage(() => import("@/pages/reports/reports")),
          },
          {
            path: ROUTES.APPROVALS,
            lazy: () => lazyPage(() => import("@/pages/approvals/approvals")),
          },
          {
            path: ROUTES.APPROVAL_DETAILS,
            loader: async ({ params }) => ({
              request: await fetchApprovalRequest(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/approvals/approval-details")),
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.EMPLOYEE_EXIT, P.EXIT_CLEARANCE_APPROVE]}
              />
            ),
            children: [
              {
                path: ROUTES.EXIT_CLEARANCES,
                loader: async () => ({
                  clearances: await fetchExitClearances(),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/employees/exit-clearances")),
              },
              {
                path: ROUTES.EXIT_CLEARANCE_DETAILS,
                loader: async ({ params }) => ({
                  clearance: await fetchExitClearance(params.uniqueId!),
                }),
                lazy: () =>
                  lazyPage(
                    () => import("@/pages/employees/exit-clearance-details")
                  ),
              },
            ],
          },

          // ── Organisation ───────────────────────────────────────────────
          {
            element: (
              <PermissionRoute requiredPermissions={[P.DEPARTMENT_VIEW]} />
            ),
            children: [
              {
                path: ROUTES.DEPARTMENTS,
                loader: async () => ({
                  departments: await fetchDepartments(true),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/organisation/departments")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.JOB_TITLE_MANAGE, P.EMPLOYMENT_TYPE_MANAGE]}
              />
            ),
            children: [
              {
                path: ROUTES.LOOKUPS,
                loader: async () => fetchLookups(true),
                lazy: () =>
                  lazyPage(() => import("@/pages/organisation/lists")),
              },
            ],
          },

          // ── Employees ──────────────────────────────────────────────────
          {
            element: (
              <PermissionRoute requiredPermissions={[P.EMPLOYEE_VIEW]} />
            ),
            children: [
              {
                path: ROUTES.EMPLOYEES,
                loader: async ({ request }) => {
                  const params = page(request.url)
                  const status = params.get("status")
                  const hasUser = params.get("user")
                  return {
                    employees: await fetchEmployees(
                      {
                        search: params.get("q") || undefined,
                        departmentUniqueId:
                          params.get("department") || undefined,
                        statuses: status
                          ? [status as never]
                          : ["ACTIVE", "ON_LEAVE", "SUSPENDED"],
                        hasUser: hasUser ? hasUser === "yes" : undefined,
                      },
                      pageInput(params)
                    ),
                  }
                },
                lazy: () =>
                  lazyPage(() => import("@/pages/employees/employees")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.EMPLOYEE_IMPORT]} />
            ),
            children: [
              {
                path: ROUTES.EMPLOYEE_IMPORT,
                lazy: () =>
                  lazyPage(() => import("@/pages/employees/employee-import")),
              },
            ],
          },
          {
            // Own profile is reachable with own_records; scope checked by API.
            path: ROUTES.EMPLOYEE_DETAILS,
            loader: async ({ params }) => ({
              employee: await fetchEmployee(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/employees/employee-details")),
          },

          // ── B1 Product Repository ──────────────────────────────────────
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.ITEM_VIEW, P.ITEM_CREATE, P.ITEM_MANAGE]}
              />
            ),
            children: [
              {
                path: ROUTES.PRODUCTS,
                loader: async ({ request }) => {
                  const params = page(request.url)
                  const status = params.get("status")
                  const { page: p, limit } = pageInput(params)
                  return {
                    products: await fetchProducts(
                      {
                        search: params.get("q") || undefined,
                        statuses: status
                          ? [status as ProductStatus]
                          : undefined,
                        categoryUniqueId: params.get("category") || undefined,
                        pendingOnly:
                          params.get("pending") === "yes" || undefined,
                      },
                      p,
                      limit
                    ),
                  }
                },
                lazy: () => lazyPage(() => import("@/pages/products/products")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.ITEM_CREATE]} />,
            children: [
              {
                path: ROUTES.PRODUCT_NEW,
                loader: async () => ({
                  product: null,
                  categories: await fetchCategories(),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/products/product-form")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.ITEM_EDIT_DRAFT]} />
            ),
            children: [
              {
                path: ROUTES.PRODUCT_EDIT,
                loader: async ({ params }) => ({
                  product: await fetchProduct(params.uniqueId!),
                  categories: await fetchCategories(),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/products/product-form")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.ITEM_IMPORT]} />,
            children: [
              {
                path: ROUTES.PRODUCT_IMPORT,
                lazy: () =>
                  lazyPage(() => import("@/pages/products/product-import")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.ITEM_CATEGORY_MANAGE]} />
            ),
            children: [
              {
                path: ROUTES.PRODUCT_CATEGORIES,
                loader: async () => ({
                  categories: await fetchCategories(true),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/products/categories")),
              },
            ],
          },
          {
            // Scope (and approver access) checked by the API.
            path: ROUTES.PRODUCT_DETAILS,
            loader: async ({ params }) => ({
              product: await fetchProduct(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/products/product-details")),
          },

          // ── B2 Store & Inventory ───────────────────────────────────────
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.STORE_MANAGE, P.STOCK_VIEW, P.ASSET_VIEW]}
              />
            ),
            children: [
              {
                path: ROUTES.STORES,
                loader: async () => ({ stores: await fetchStores(true) }),
                lazy: () => lazyPage(() => import("@/pages/store/stores")),
              },
              {
                path: ROUTES.STORE_DETAILS,
                loader: async ({ params }) => ({
                  store: await fetchStore(params.uniqueId!),
                  stores: await fetchStores(true),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/store/store-details")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.STOCK_VIEW]} />,
            children: [
              {
                path: ROUTES.STOCK,
                loader: async ({ request }) => {
                  const params = page(request.url)
                  const [levels, stores] = await Promise.all([
                    fetchStockLevels({
                      storeUniqueId: params.get("store") || undefined,
                      search: params.get("q") || undefined,
                      belowReorderOnly:
                        params.get("below") === "yes" || undefined,
                    }),
                    fetchStores(),
                  ])
                  return { levels, stores }
                },
                lazy: () => lazyPage(() => import("@/pages/store/stock")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute anyPermissions={[P.ASSET_VIEW, P.STOCK_VIEW]} />
            ),
            children: [
              {
                path: ROUTES.ASSETS,
                loader: async ({ request }) => {
                  const params = page(request.url)
                  const status = params.get("status")
                  const { page: p, limit } = pageInput(params)
                  const [assets, stores] = await Promise.all([
                    fetchAssets(
                      {
                        search: params.get("q") || undefined,
                        storeUniqueId: params.get("store") || undefined,
                        statuses: status ? [status as AssetStatus] : undefined,
                        categoryUniqueId: params.get("category") || undefined,
                        productUniqueId: params.get("product") || undefined,
                        vehiclesOnly:
                          params.get("vehicles") === "yes" || undefined,
                      },
                      p,
                      limit
                    ),
                    fetchStores(),
                  ])
                  return { assets, stores }
                },
                lazy: () => lazyPage(() => import("@/pages/store/assets")),
              },
            ],
          },
          {
            path: ROUTES.ASSET_DETAILS,
            loader: async ({ params }) => ({
              asset: await fetchAsset(params.uniqueId!),
            }),
            lazy: () => lazyPage(() => import("@/pages/store/asset-details")),
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.ASSET_TAG_PRINT]} />
            ),
            children: [
              {
                path: ROUTES.ASSET_TAGS,
                lazy: () => lazyPage(() => import("@/pages/store/tags")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.STOCK_ADJUST, P.STOCK_VIEW, P.STORE_MANAGE]}
              />
            ),
            children: [
              {
                path: ROUTES.ADJUSTMENTS,
                loader: async () => ({ adjustments: await fetchAdjustments() }),
                lazy: () => lazyPage(() => import("@/pages/store/adjustments")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.STOCK_ADJUST]} />,
            children: [
              {
                path: ROUTES.ADJUSTMENT_NEW,
                loader: async () => ({ stores: await fetchStores() }),
                lazy: () =>
                  lazyPage(() => import("@/pages/store/adjustment-form")),
              },
              {
                path: ROUTES.OPENING_BALANCE,
                loader: async () => ({ stores: await fetchStores() }),
                lazy: () =>
                  lazyPage(() => import("@/pages/store/opening-balance")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[
                  P.TRANSFER_CREATE,
                  P.TRANSFER_DISPATCH,
                  P.TRANSFER_RECEIVE,
                  P.STOCK_VIEW,
                  P.STORE_MANAGE,
                ]}
              />
            ),
            children: [
              {
                path: ROUTES.TRANSFERS,
                loader: async () => ({ transfers: await fetchTransfers() }),
                lazy: () => lazyPage(() => import("@/pages/store/transfers")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.TRANSFER_CREATE]} />
            ),
            children: [
              {
                path: ROUTES.TRANSFER_NEW,
                loader: async () => ({ stores: await fetchStores() }),
                lazy: () =>
                  lazyPage(() => import("@/pages/store/transfer-form")),
              },
            ],
          },
          {
            path: ROUTES.TRANSFER_DETAILS,
            loader: async ({ params }) => ({
              transfer: await fetchTransfer(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/store/transfer-details")),
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.STOCK_ISSUE, P.STOCK_RETURN, P.STOCK_VIEW]}
              />
            ),
            children: [
              {
                path: ROUTES.ISSUES,
                loader: async () => ({
                  documents: await fetchStockDocuments(),
                }),
                lazy: () => lazyPage(() => import("@/pages/store/issues")),
              },
              {
                path: ROUTES.ISSUE_DETAILS,
                loader: async ({ params }) => ({
                  document: await fetchStockDocument(params.uniqueId!),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/store/issue-details")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[P.STOCK_ISSUE, P.STOCK_RETURN]}
              />
            ),
            children: [
              {
                path: ROUTES.ISSUE_NEW,
                loader: async () => ({ stores: await fetchStores() }),
                lazy: () => lazyPage(() => import("@/pages/store/issue-form")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[
                  P.STOCK_COUNT_CREATE,
                  P.STOCK_COUNT_COUNT,
                  P.STOCK_COUNT_APPROVE,
                  P.STOCK_VIEW,
                ]}
              />
            ),
            children: [
              {
                path: ROUTES.COUNTS,
                loader: async () => {
                  const [counts, stores] = await Promise.all([
                    fetchCounts(),
                    fetchStores(),
                  ])
                  return { counts, stores }
                },
                lazy: () => lazyPage(() => import("@/pages/store/counts")),
              },
            ],
          },
          {
            path: ROUTES.COUNT_DETAILS,
            loader: async ({ params }) => ({
              count: await fetchCount(params.uniqueId!),
            }),
            lazy: () => lazyPage(() => import("@/pages/store/count-details")),
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[
                  P.MAINTENANCE_CREATE,
                  P.MAINTENANCE_UPDATE,
                  P.ASSET_VIEW,
                  P.STOCK_VIEW,
                ]}
              />
            ),
            children: [
              {
                path: ROUTES.MAINTENANCE,
                loader: async () => ({ tickets: await fetchTickets() }),
                lazy: () => lazyPage(() => import("@/pages/store/maintenance")),
              },
            ],
          },
          {
            path: ROUTES.MAINTENANCE_DETAILS,
            loader: async ({ params }) => ({
              ticket: await fetchTicket(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/store/maintenance-details")),
          },
          {
            element: (
              <PermissionRoute
                anyPermissions={[
                  P.DISPOSAL_PROPOSE,
                  P.DISPOSAL_APPROVE,
                  P.ASSET_VIEW,
                  P.STOCK_VIEW,
                ]}
              />
            ),
            children: [
              {
                path: ROUTES.DISPOSALS,
                loader: async () => ({ disposals: await fetchDisposals() }),
                lazy: () => lazyPage(() => import("@/pages/store/disposals")),
              },
            ],
          },
          {
            path: ROUTES.DISPOSAL_DETAILS,
            loader: async ({ params }) => ({
              disposal: await fetchDisposal(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/store/disposal-details")),
          },
          {
            // Creator, store staff and approvers; checked by the API.
            path: ROUTES.ADJUSTMENT_DETAILS,
            loader: async ({ params }) => ({
              adjustment: await fetchAdjustment(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/store/adjustment-details")),
          },

          // ── Access administration ──────────────────────────────────────
          {
            element: <PermissionRoute requiredPermissions={[P.USER_VIEW]} />,
            children: [
              {
                path: ROUTES.USERS,
                loader: async ({ request }) => {
                  const params = page(request.url)
                  const status = params.get("status")
                  return {
                    users: await fetchUsers(
                      {
                        search: params.get("q") || undefined,
                        statuses: status ? [status as never] : undefined,
                        roleUniqueId: params.get("role") || undefined,
                      },
                      pageInput(params)
                    ),
                  }
                },
                lazy: () => lazyPage(() => import("@/pages/admin/users")),
              },
              {
                path: ROUTES.USER_DETAILS,
                loader: async ({ params }) => ({
                  user: await fetchUser(params.uniqueId!),
                }),
                lazy: () =>
                  lazyPage(() => import("@/pages/admin/user-details")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.ROLE_VIEW]} />,
            children: [
              {
                path: ROUTES.ROLES,
                loader: async () => ({ roles: await fetchRoles(true) }),
                lazy: () => lazyPage(() => import("@/pages/admin/roles")),
              },
              {
                path: ROUTES.ROLE_DETAILS,
                loader: async ({ params }) => {
                  const [catalogue, role] = await Promise.all([
                    fetchPermissionCatalogue(),
                    params.uniqueId === "new"
                      ? Promise.resolve(null)
                      : fetchRole(params.uniqueId!),
                  ])
                  return { catalogue, role }
                },
                lazy: () => lazyPage(() => import("@/pages/admin/role-editor")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.GROUP_MANAGE]} />,
            children: [
              {
                path: ROUTES.GROUPS,
                loader: async () => ({ groups: await fetchGroups(true) }),
                lazy: () => lazyPage(() => import("@/pages/admin/groups")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.POLICY_VIEW]} />,
            children: [
              {
                path: ROUTES.POLICIES,
                loader: async () => ({ settings: await fetchPolicySettings() }),
                lazy: () => lazyPage(() => import("@/pages/admin/policies")),
              },
            ],
          },
          {
            element: (
              <PermissionRoute requiredPermissions={[P.WORKFLOW_VIEW]} />
            ),
            children: [
              {
                path: ROUTES.WORKFLOWS,
                loader: async () => ({ points: await fetchApprovalPoints() }),
                lazy: () => lazyPage(() => import("@/pages/admin/workflows")),
              },
              {
                path: ROUTES.WORKFLOW_DETAILS,
                loader: async ({ params }) =>
                  fetchApprovalPoint(params.uniqueId!),
                lazy: () =>
                  lazyPage(() => import("@/pages/admin/workflow-editor")),
              },
            ],
          },
          {
            element: <PermissionRoute requiredPermissions={[P.AUDIT_VIEW]} />,
            children: [
              {
                path: ROUTES.AUDIT_LOG,
                lazy: () => lazyPage(() => import("@/pages/admin/audit-log")),
              },
            ],
          },
        ],
      },
    ],
  },

  /** Error pages */
  {
    path: ROUTES.FORBIDDEN,
    lazy: () => lazyPage(() => import("@/pages/errors/forbidden")),
  },
  {
    path: "*",
    lazy: () => lazyPage(() => import("@/pages/errors/not-found")),
  },
])

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
            // Own profile is reachable with own_records; scope checked by API.
            path: ROUTES.EMPLOYEE_DETAILS,
            loader: async ({ params }) => ({
              employee: await fetchEmployee(params.uniqueId!),
            }),
            lazy: () =>
              lazyPage(() => import("@/pages/employees/employee-details")),
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

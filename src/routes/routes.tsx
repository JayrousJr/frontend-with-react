import type { ComponentType } from "react"
import LoadingPage from "@/components/loading-page"
import { useAuth } from "@/context/auth-context"
import AuthLayout from "@/layouts/auth-layout"
import DashboardLayout from "@/layouts/dashboard-layout"
import LandingLayout from "@/layouts/landing-layout"
import Home from "@/pages/guests/home"
import { createBrowserRouter, Navigate } from "react-router"
import { ROUTES, AUTH_ROUTES } from "./routeConstants"
import ProtectedRoute from "./protected-route"
import PublicOnlyRoute from "./public-only-route"
import PermissionRoute from "./permission-route"
import RouterErrorBoundary from "./router-error-boundary"
import { fetchUser, fetchUsers } from "@/services/users"
import {
  fetchCampaign,
  fetchCampaigns,
  type CampaignStatus,
} from "@/services/campaigns"
import { fetchPageViews, fetchVisitorStats } from "@/services/analytics"
import { fetchNewsletterSubscribers } from "@/services/newsletter"
import { PERMISSIONS } from "@/lib/permissions"

async function lazyPage(importFn: () => Promise<{ default: ComponentType }>) {
  const mod = await importFn()
  return { Component: mod.default }
}

/** Root index: the landing page is visible to everyone, logged in or not. */
// eslint-disable-next-line react-refresh/only-export-components
function RootIndex() {
  const { isLoading } = useAuth()
  if (isLoading) return <LoadingPage />
  return <Home />
}

export const routes = createBrowserRouter([
  /** Public routes */
  {
    Component: LandingLayout,
    errorElement: <RouterErrorBoundary />,
    children: [{ index: true, Component: RootIndex }],
  },

  /** OAuth landing — outside PublicOnlyRoute: it starts unauthenticated and
   *  becomes authenticated mid-page while trading the fragment tokens. */
  {
    path: ROUTES.OAUTH_CALLBACK,
    errorElement: <RouterErrorBoundary />,
    lazy: () => lazyPage(() => import("@/pages/auth/oauth-callback")),
  },

  /** Auth routes — blocked for authenticated users */
  {
    path: "auth",
    Component: PublicOnlyRoute,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        Component: AuthLayout,
        children: [
          {
            path: AUTH_ROUTES.LOGIN,
            lazy: () => lazyPage(() => import("@/pages/auth/login")),
          },
          {
            path: AUTH_ROUTES.REGISTER,
            lazy: () => lazyPage(() => import("@/pages/auth/register")),
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
            lazy: async () => {
              const { default: Component, action } =
                await import("@/pages/auth/reset-password")
              return { Component, action }
            },
          },
        ],
      },
    ],
  },

  /** Protected routes (auth required) */
  {
    Component: ProtectedRoute,
    errorElement: <RouterErrorBoundary />,
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

          /** Permission-gated: user management (backend requires users.read) */
          {
            element: (
              <PermissionRoute requiredPermissions={[PERMISSIONS.USERS.READ]} />
            ),
            children: [
              {
                path: ROUTES.USERS,
                loader: async ({ request }) => {
                  const params = new URL(request.url).searchParams
                  const page = Number(params.get("page") ?? "1")
                  const limit = Number(params.get("limit") ?? "10")
                  const status = params.get("status")
                  return {
                    users: await fetchUsers(
                      { page, limit },
                      {
                        email: params.get("q") || undefined,
                        role: params.get("role") || undefined,
                        isActive: status ? status === "active" : undefined,
                      }
                    ),
                  }
                },
                lazy: () =>
                  lazyPage(() => import("@/pages/dashboard/users/users")),
              },
              {
                path: ROUTES.USER_DETAILS,
                loader: async ({ params }) => {
                  return { user: await fetchUser(params.uniqueId!) }
                },
                lazy: () =>
                  lazyPage(
                    () => import("@/pages/dashboard/users/user-details")
                  ),
              },
            ],
          },

          /** Permission-gated: role management (backend requires roles.read) */
          {
            element: (
              <PermissionRoute requiredPermissions={[PERMISSIONS.ROLES.READ]} />
            ),
            children: [
              {
                path: ROUTES.ROLES,
                lazy: () =>
                  lazyPage(() => import("@/pages/dashboard/roles/roles")),
              },
            ],
          },

          /** Permission-gated: newsletter campaigns (backend requires campaigns.read) */
          {
            element: (
              <PermissionRoute
                requiredPermissions={[PERMISSIONS.CAMPAIGNS.READ]}
              />
            ),
            children: [
              {
                path: ROUTES.CAMPAIGNS,
                loader: async ({ request }) => {
                  const params = new URL(request.url).searchParams
                  const page = Number(params.get("page") ?? "1")
                  const limit = Number(params.get("limit") ?? "10")
                  return {
                    campaigns: await fetchCampaigns(
                      { page, limit },
                      {
                        subject: params.get("q") || undefined,
                        status:
                          (params.get("status") as CampaignStatus) || undefined,
                      }
                    ),
                  }
                },
                lazy: () =>
                  lazyPage(
                    () => import("@/pages/dashboard/campaigns/campaigns")
                  ),
              },
              {
                path: ROUTES.CAMPAIGN_DETAILS,
                loader: async ({ params }) => {
                  return { campaign: await fetchCampaign(params.uniqueId!) }
                },
                lazy: () =>
                  lazyPage(
                    () => import("@/pages/dashboard/campaigns/campaign-details")
                  ),
              },
            ],
          },

          /** Permission-gated: newsletter subscriber list (backend requires newsletter.read) */
          {
            element: (
              <PermissionRoute
                requiredPermissions={[PERMISSIONS.NEWSLETTER.READ]}
              />
            ),
            children: [
              {
                path: ROUTES.SUBSCRIBERS,
                loader: async ({ request }) => {
                  const params = new URL(request.url).searchParams
                  const page = Number(params.get("page") ?? "1")
                  const limit = Number(params.get("limit") ?? "10")
                  const status = params.get("status")
                  return {
                    subscribers: await fetchNewsletterSubscribers(
                      { page, limit },
                      {
                        email: params.get("q") || undefined,
                        isActive: status ? status === "active" : undefined,
                      }
                    ),
                  }
                },
                lazy: () =>
                  lazyPage(
                    () => import("@/pages/dashboard/subscribers/subscribers")
                  ),
              },
            ],
          },

          /** Permission-gated: visitor analytics (backend requires analytics.read) */
          {
            element: (
              <PermissionRoute
                requiredPermissions={[PERMISSIONS.ANALYTICS.READ]}
              />
            ),
            children: [
              {
                path: ROUTES.VISITORS,
                loader: async ({ request }) => {
                  const params = new URL(request.url).searchParams
                  const page = Number(params.get("page") ?? "1")
                  const limit = Number(params.get("limit") ?? "10")
                  const path = params.get("q") || undefined
                  const [stats, pageViews] = await Promise.all([
                    fetchVisitorStats({ page, limit }, { path }),
                    fetchPageViews({ page, limit }, { path }),
                  ])
                  return { stats, pageViews }
                },
                lazy: () =>
                  lazyPage(() => import("@/pages/dashboard/visitors/visitors")),
              },
            ],
          },
        ],
      },
    ],
  },

  /** Error pages */
  {
    path: ROUTES.NOT_FOUND,
    lazy: () => lazyPage(() => import("@/pages/errors/not-found")),
  },
  {
    path: ROUTES.FORBIDDEN,
    lazy: () => lazyPage(() => import("@/pages/errors/forbidden")),
  },

  /** Catch 404 */
  {
    path: "*",
    element: <Navigate to={ROUTES.NOT_FOUND} replace />,
  },
])

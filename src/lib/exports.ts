import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { ROUTES } from "@/routes/routeConstants"
import { P } from "@/lib/permissions"
import i18n from "@/config/i18n"

const t = i18n.t
export const logo = "/logo.png"
export const userImg = "/user.png"
export const APP_NAME =
  (import.meta.env.VITE_APP_NAME as string) || "AzamTV Management"

export type NavSubItem = {
  id: string
  title: () => string
  url: string
  /** Hidden unless the user holds every listed permission (any scope). */
  requiredPermissions?: string[]
  /** Hidden unless the user holds at least one of these. */
  anyPermissions?: string[]
}

export type NavMainItem = {
  id: string
  title: () => string
  url: string
  icon: LucideIcon
  isActive?: boolean
  requiredPermissions?: string[]
  items?: NavSubItem[]
}

/**
 * Sidebar. Each module adds its section here as it is built; items are
 * filtered against the user's permissions (never role names).
 */
export const navMain: NavMainItem[] = [
  {
    id: "home",
    title: () => t("nav.home", "Home"),
    url: "#",
    icon: LayoutDashboardIcon,
    isActive: true,
    items: [
      {
        id: "dashboard",
        title: () => t("nav.dashboard", "Dashboard"),
        url: ROUTES.DASHBOARD,
      },
      {
        id: "my-account",
        title: () => t("nav.my_account", "My account"),
        url: ROUTES.SETTINGS,
      },
      {
        id: "delegations",
        title: () => t("nav.delegations", "Delegations"),
        url: ROUTES.DELEGATIONS,
        anyPermissions: [P.DELEGATION_CREATE, P.DELEGATION_APPROVE],
      },
    ],
  },
  {
    id: "organisation",
    title: () => t("nav.organisation", "Organisation"),
    url: "#",
    icon: Building2Icon,
    isActive: true,
    items: [
      {
        id: "departments",
        title: () => t("nav.departments", "Departments"),
        url: ROUTES.DEPARTMENTS,
        requiredPermissions: [P.DEPARTMENT_VIEW],
      },
      {
        id: "lists",
        title: () => t("nav.lists", "Job titles & types"),
        url: ROUTES.LOOKUPS,
        anyPermissions: [P.JOB_TITLE_MANAGE, P.EMPLOYMENT_TYPE_MANAGE],
      },
    ],
  },
  {
    id: "people",
    title: () => t("nav.people", "People"),
    url: "#",
    icon: UsersIcon,
    isActive: true,
    items: [
      {
        id: "employees",
        title: () => t("nav.employees", "Employees"),
        url: ROUTES.EMPLOYEES,
        requiredPermissions: [P.EMPLOYEE_VIEW],
      },
    ],
  },
  {
    id: "access",
    title: () => t("nav.access", "Access & security"),
    url: "#",
    icon: ShieldCheckIcon,
    isActive: true,
    items: [
      {
        id: "users",
        title: () => t("nav.users", "Users"),
        url: ROUTES.USERS,
        requiredPermissions: [P.USER_VIEW],
      },
      {
        id: "roles",
        title: () => t("nav.roles", "Roles"),
        url: ROUTES.ROLES,
        requiredPermissions: [P.ROLE_VIEW],
      },
      {
        id: "groups",
        title: () => t("nav.groups", "Groups"),
        url: ROUTES.GROUPS,
        requiredPermissions: [P.GROUP_MANAGE],
      },
      {
        id: "policies",
        title: () => t("nav.policies", "SoD & security settings"),
        url: ROUTES.POLICIES,
        requiredPermissions: [P.POLICY_VIEW],
      },
      {
        id: "audit",
        title: () => t("nav.audit", "Audit log"),
        url: ROUTES.AUDIT_LOG,
        requiredPermissions: [P.AUDIT_VIEW],
      },
    ],
  },
]

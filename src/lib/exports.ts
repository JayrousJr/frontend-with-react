import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  PackageSearchIcon,
  WarehouseIcon,
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
        id: "approvals",
        title: () => t("nav.approvals", "My approvals"),
        url: ROUTES.APPROVALS,
      },
      {
        id: "reports",
        title: () => t("nav.reports", "Reports"),
        url: ROUTES.REPORTS,
        anyPermissions: [
          P.EMPLOYEE_VIEW,
          P.USER_VIEW,
          P.ROLE_VIEW,
          P.SECURITY_VIEW_LOGINS,
          P.DELEGATION_APPROVE,
          P.EMPLOYEE_EXIT,
          P.EMPLOYEE_IMPORT,
          P.ASSET_VIEW,
          P.STOCK_VIEW,
        ],
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
      {
        id: "exit-clearances",
        title: () => t("nav.exit_clearances", "Exit clearances"),
        url: ROUTES.EXIT_CLEARANCES,
        anyPermissions: [P.EMPLOYEE_EXIT, P.EXIT_CLEARANCE_APPROVE],
      },
    ],
  },
  {
    id: "products",
    title: () => t("nav.products_section", "Products"),
    url: "#",
    icon: PackageSearchIcon,
    isActive: true,
    items: [
      {
        id: "product-repository",
        title: () => t("nav.products", "Product Repository"),
        url: ROUTES.PRODUCTS,
        anyPermissions: [P.ITEM_VIEW, P.ITEM_CREATE, P.ITEM_MANAGE],
      },
      {
        id: "product-categories",
        title: () => t("nav.categories", "Categories"),
        url: ROUTES.PRODUCT_CATEGORIES,
        requiredPermissions: [P.ITEM_CATEGORY_MANAGE],
      },
    ],
  },
  {
    id: "store",
    title: () => t("nav.store", "Store"),
    url: "#",
    icon: WarehouseIcon,
    isActive: true,
    items: [
      {
        id: "stock",
        title: () => t("nav.stock", "Stock"),
        url: ROUTES.STOCK,
        requiredPermissions: [P.STOCK_VIEW],
      },
      {
        id: "assets",
        title: () => t("nav.assets", "Assets"),
        url: ROUTES.ASSETS,
        anyPermissions: [P.ASSET_VIEW, P.STOCK_VIEW],
      },
      {
        id: "adjustments",
        title: () => t("nav.adjustments", "Adjustments"),
        url: ROUTES.ADJUSTMENTS,
        anyPermissions: [P.STOCK_ADJUST, P.STOCK_VIEW, P.STORE_MANAGE],
      },
      {
        id: "tags",
        title: () => t("nav.tags", "Asset tags"),
        url: ROUTES.ASSET_TAGS,
        requiredPermissions: [P.ASSET_TAG_PRINT],
      },
      {
        id: "stores",
        title: () => t("nav.stores", "Stores & locations"),
        url: ROUTES.STORES,
        anyPermissions: [P.STORE_MANAGE, P.STOCK_VIEW, P.ASSET_VIEW],
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
        id: "workflows",
        title: () => t("nav.workflows", "Approval chains"),
        url: ROUTES.WORKFLOWS,
        requiredPermissions: [P.WORKFLOW_VIEW],
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

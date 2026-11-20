import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  Building2Icon,
  ChevronRightIcon,
  InboxIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/app/page-header"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchMyApprovalTasks } from "@/services/workflow"

type Shortcut = {
  title: string
  description: string
  to: string
  icon: LucideIcon
  permission: string
}

const DashboardPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [pending, setPending] = useState<number | null>(null)
  useEffect(() => {
    void fetchMyApprovalTasks()
      .then((r) => setPending(r.length))
      .catch(() => setPending(null))
  }, [])
  if (!user) return null

  const shortcuts: Shortcut[] = [
    {
      title: t("nav.employees", "Employees"),
      description: t(
        "dashboard.employees_hint",
        "Employee directory, profiles and history"
      ),
      to: ROUTES.EMPLOYEES,
      icon: UsersIcon,
      permission: P.EMPLOYEE_VIEW,
    },
    {
      title: t("nav.departments", "Departments"),
      description: t(
        "dashboard.departments_hint",
        "Departments, sections, HODs and acting HODs"
      ),
      to: ROUTES.DEPARTMENTS,
      icon: Building2Icon,
      permission: P.DEPARTMENT_VIEW,
    },
    {
      title: t("nav.users", "Users"),
      description: t(
        "dashboard.users_hint",
        "Create users from employees and assign roles"
      ),
      to: ROUTES.USERS,
      icon: UserCogIcon,
      permission: P.USER_VIEW,
    },
    {
      title: t("nav.roles", "Roles"),
      description: t(
        "dashboard.roles_hint",
        "Build roles from permissions and scopes"
      ),
      to: ROUTES.ROLES,
      icon: KeyRoundIcon,
      permission: P.ROLE_VIEW,
    },
    {
      title: t("nav.policies", "SoD & security settings"),
      description: t(
        "dashboard.policies_hint",
        "Separation-of-duties rules and security values"
      ),
      to: ROUTES.POLICIES,
      icon: ShieldCheckIcon,
      permission: P.POLICY_VIEW,
    },
    {
      title: t("nav.audit", "Audit log"),
      description: t("dashboard.audit_hint", "Who changed what, and when"),
      to: ROUTES.AUDIT_LOG,
      icon: ScrollTextIcon,
      permission: P.AUDIT_VIEW,
    },
  ].filter((s) => hasPermission(user, s.permission))

  const firstName = user.fullName.split(" ")[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.greeting", "Welcome, {{name}}", {
          name: firstName,
        })}
        description={`${user.jobTitle} · ${user.department.name}`}
      />

      {pending !== null && pending > 0 && (
        <Link
          to={ROUTES.APPROVALS}
          className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15"
        >
          <InboxIcon className="size-5 text-amber-700 dark:text-amber-400" />
          <span className="flex-1 font-medium">
            {t(
              "dashboard.pending_approvals",
              "{{count}} requests are waiting for your decision",
              {
                count: pending,
              }
            )}
          </span>
          <ChevronRightIcon className="size-4" />
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.shortcuts", "Your work areas")}</CardTitle>
            <CardDescription>
              {t(
                "dashboard.shortcuts_hint",
                "Shown according to the permissions your roles give you."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shortcuts.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {shortcuts.map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <s.icon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.description}
                      </div>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  "dashboard.no_shortcuts",
                  "More areas appear here as modules are rolled out and roles are assigned to you."
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.my_profile", "My profile")}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">
                {t("employees.number", "Employee no.")}
              </dt>
              <dd className="font-mono">{user.employeeNumber}</dd>
              <dt className="text-muted-foreground">
                {t("employees.department", "Department")}
              </dt>
              <dd>{user.department.name}</dd>
            </dl>
            <div>
              <div className="mb-2 text-muted-foreground">
                {t("dashboard.my_roles", "My roles")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.roles.length ? (
                  user.roles.map((r) => (
                    <Badge
                      key={`${r.roleName}-${r.contextName}`}
                      variant="secondary"
                    >
                      {r.roleName}
                      {r.contextName ? ` · ${r.contextName}` : ""}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <Link
              to={withId(ROUTES.EMPLOYEE_DETAILS, user.employeeUniqueId)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("dashboard.view_profile", "View my employee record")}
              <ChevronRightIcon className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage

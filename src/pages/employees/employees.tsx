import { useEffect, useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { PlusIcon, TruckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import { EMPLOYEE_STATUSES, type Employee } from "@/services/employees"
import { fetchDepartments, type Department } from "@/services/org"
import type { Page } from "@/services/types"
import { EmployeeFormSheet } from "./employee-form"

const EmployeesPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { employees } = useLoaderData() as { employees: Page<Employee> }
  const navigation = useNavigation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const canManage = hasPermission(user, P.EMPLOYEE_MANAGE)

  useEffect(() => {
    if (hasPermission(user, P.DEPARTMENT_VIEW)) {
      void fetchDepartments().then(setDepartments)
    }
  }, [user])

  const update = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    })

  const columns: ColumnDef<Employee>[] = [
    {
      id: "name",
      header: t("employees.employee", "Employee"),
      cell: ({ row }) => (
        <Link
          to={withId(ROUTES.EMPLOYEE_DETAILS, row.original.uniqueId)}
          className="group block"
        >
          <div className="font-medium group-hover:underline">
            {row.original.fullName}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.companyEmail}
          </div>
        </Link>
      ),
    },
    {
      id: "number",
      header: t("employees.number", "Employee no."),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.employeeNumber}</span>
      ),
    },
    {
      id: "department",
      header: t("employees.department", "Department"),
      cell: ({ row }) => row.original.department.name,
    },
    {
      id: "title",
      header: t("employees.job_title", "Job title"),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          {row.original.jobTitle.name}
          {row.original.driverProfile && (
            <TruckIcon
              className="size-3.5 text-muted-foreground"
              aria-label={t("employees.driver", "Driver")}
            />
          )}
        </span>
      ),
    },
    {
      id: "status",
      header: t("common.status", "Status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "user",
      header: t("employees.user", "User account"),
      cell: ({ row }) =>
        row.original.user ? (
          <StatusBadge status={row.original.user.status} />
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("employees.no_user", "No user")}
          </span>
        ),
    },
  ]

  const filters = [
    {
      key: "status",
      label: t("common.status", "Status"),
      options: EMPLOYEE_STATUSES.map((s) => ({
        value: s,
        label: t(`status.${s}`, s.replace("_", " ").toLowerCase()),
      })),
    },
    {
      key: "user",
      label: t("employees.user", "User account"),
      options: [
        { value: "yes", label: t("employees.has_user", "Has a user") },
        { value: "no", label: t("employees.no_user", "No user") },
      ],
    },
    ...(departments.length
      ? [
          {
            key: "department",
            label: t("employees.department", "Department"),
            options: departments.map((d) => ({
              value: d.uniqueId,
              label: d.name,
            })),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employees.title", "Employees")}
        description={t(
          "employees.subtitle",
          "Everyone who works for AzamTV. Users are created from these records."
        )}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              {t("employees.new", "New employee")}
            </Button>
          )
        }
      />
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={employees.data}
            total={employees.total}
            page={employees.page}
            pageSize={employees.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(p) => update({ page: String(p) })}
            onPageSizeChange={(s) => update({ limit: String(s) })}
            searchPlaceholder={t(
              "employees.search",
              "Search name, number or email"
            )}
            searchValue={params.get("q") ?? ""}
            onSearch={(v) => update({ q: v, page: "" })}
            filters={filters}
            activeFilters={{
              status: params.get("status") ?? "",
              user: params.get("user") ?? "",
              department: params.get("department") ?? "",
            }}
            onFilterChange={(k, v) => update({ [k]: v, page: "" })}
            onClearFilters={() =>
              update({ q: "", status: "", user: "", department: "", page: "" })
            }
          />
          {!params.get("status") && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "employees.exited_hidden",
                "Exited employees are hidden unless you filter by status."
              )}
            </p>
          )}
        </CardContent>
      </Card>
      {creating && (
        <EmployeeFormSheet
          employee={null}
          onClose={() => setCreating(false)}
          onSaved={(e) => navigate(withId(ROUTES.EMPLOYEE_DETAILS, e.uniqueId))}
        />
      )}
    </div>
  )
}

export default EmployeesPage

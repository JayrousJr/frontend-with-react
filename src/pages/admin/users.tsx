import { useEffect, useState } from "react"
import {
  Link,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchEmployees, type Employee } from "@/services/employees"
import { fetchRoles, type Role } from "@/services/access"
import { createUsersFromEmployees, type AppUser } from "@/services/users"
import type { Page } from "@/services/types"

const STATUSES = ["PENDING_ACTIVATION", "ACTIVE", "LOCKED", "DEACTIVATED"]

const UsersPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { users } = useLoaderData() as { users: Page<AppUser> }
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => {
    if (hasPermission(user, P.ROLE_VIEW)) {
      void fetchRoles().then((r) => setRoles(r.data))
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

  const columns: ColumnDef<AppUser>[] = [
    {
      id: "user",
      header: t("users.user", "User"),
      cell: ({ row }) => (
        <Link
          to={withId(ROUTES.USER_DETAILS, row.original.uniqueId)}
          className="group block"
        >
          <div className="font-medium group-hover:underline">
            {row.original.employee.fullName}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.email}
          </div>
        </Link>
      ),
    },
    {
      id: "department",
      header: t("employees.department", "Department"),
      cell: ({ row }) => row.original.department.name,
    },
    {
      id: "roles",
      header: t("users.roles", "Roles"),
      cell: ({ row }) => (
        <div className="flex max-w-80 flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge
              key={`${r.roleUniqueId}-${r.contextUniqueId}`}
              variant="secondary"
            >
              {r.roleName}
              {r.contextName ? ` · ${r.contextName}` : ""}
            </Badge>
          ))}
          {row.original.roles.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: t("common.status", "Status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "last",
      header: t("users.last_login", "Last login"),
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatStamp(row.original.lastLoginAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title", "Users")}
        description={t(
          "users.subtitle",
          "Staff accounts. Each user is created from an employee and logs in with the company email."
        )}
        actions={
          hasPermission(user, P.USER_MANAGE) && (
            <Button onClick={() => setCreating(true)}>
              <UserPlusIcon />
              {t("users.create", "Create users from employees")}
            </Button>
          )
        }
      />
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={users.data}
            total={users.total}
            page={users.page}
            pageSize={users.limit}
            isLoading={navigation.state === "loading"}
            onPageChange={(p) => update({ page: String(p) })}
            onPageSizeChange={(s) => update({ limit: String(s) })}
            searchPlaceholder={t(
              "users.search",
              "Search name, number or email"
            )}
            searchValue={params.get("q") ?? ""}
            onSearch={(v) => update({ q: v, page: "" })}
            filters={[
              {
                key: "status",
                label: t("common.status", "Status"),
                options: STATUSES.map((s) => ({
                  value: s,
                  label: t(`status.${s}`, s.replace("_", " ").toLowerCase()),
                })),
              },
              ...(roles.length
                ? [
                    {
                      key: "role",
                      label: t("users.role", "Role"),
                      options: roles.map((r) => ({
                        value: r.uniqueId,
                        label: r.name,
                      })),
                    },
                  ]
                : []),
            ]}
            activeFilters={{
              status: params.get("status") ?? "",
              role: params.get("role") ?? "",
            }}
            onFilterChange={(k, v) => update({ [k]: v, page: "" })}
            onClearFilters={() =>
              update({ q: "", status: "", role: "", page: "" })
            }
          />
        </CardContent>
      </Card>
      {creating && (
        <CreateUsersDialog
          roles={roles.filter((r) => r.isActive && !r.contextType)}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            revalidator.revalidate()
          }}
        />
      )}
    </div>
  )
}

/** Pick Active employees without a user; optionally give everyone roles. */
function CreateUsersDialog({
  roles,
  onClose,
  onCreated,
}: {
  roles: Role[]
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [search, setSearch] = useState("")
  const [candidates, setCandidates] = useState<Employee[] | null>(null)
  const [picked, setPicked] = useState<Map<string, Employee>>(new Map())
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const h = setTimeout(() => {
      void fetchEmployees(
        { search: search || undefined, statuses: ["ACTIVE"], hasUser: false },
        { page: 1, limit: 50 }
      ).then((p) => !cancelled && setCandidates(p.data))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(h)
    }
  }, [search])

  const toggle = (e: Employee) =>
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(e.uniqueId)) next.delete(e.uniqueId)
      else next.set(e.uniqueId, e)
      return next
    })

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("users.create", "Create users from employees")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "users.create_hint",
              "Only Active employees without a user are listed. Each one receives an activation link at their company email (valid 24 hours)."
            )}
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder={t("employees.search", "Search name, number or email")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {candidates === null ? (
            <div className="flex justify-center p-6">
              <Spinner />
            </div>
          ) : candidates.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t(
                "users.no_candidates",
                "No Active employees without a user match."
              )}
            </p>
          ) : (
            <ul className="divide-y">
              {candidates.map((e) => (
                <li key={e.uniqueId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                    <Checkbox
                      checked={picked.has(e.uniqueId)}
                      onCheckedChange={() => toggle(e)}
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">{e.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {e.employeeNumber} · {e.companyEmail} ·{" "}
                        {e.department.name}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {roles.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t("users.initial_roles", "Roles for all of them (optional)")}
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const on = roleIds.has(r.uniqueId)
                return (
                  <Button
                    key={r.uniqueId}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    onClick={() =>
                      setRoleIds((prev) => {
                        const next = new Set(prev)
                        if (on) next.delete(r.uniqueId)
                        else next.add(r.uniqueId)
                        return next
                      })
                    }
                  >
                    {r.name}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {t("users.selected", "{{count}} selected", { count: picked.size })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {t("actions.cancel", "Cancel")}
            </Button>
            <Button
              disabled={busy || picked.size === 0}
              onClick={async () => {
                setBusy(true)
                let msg = ""
                const ok = await run(async () => {
                  const r = await createUsersFromEmployees(
                    [...picked.keys()],
                    [...roleIds].map((roleUniqueId) => ({ roleUniqueId }))
                  )
                  msg = t(
                    "users.created",
                    "{{created}} created, {{skipped}} skipped",
                    {
                      created: r.created.length,
                      skipped: r.skipped.length,
                    }
                  )
                })
                setBusy(false)
                if (ok) {
                  toast.success(msg)
                  onCreated()
                }
              }}
            >
              {t("users.create_n", "Create {{count}} users", {
                count: picked.size,
              })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UsersPage

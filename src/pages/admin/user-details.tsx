import { useEffect, useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  KeyRoundIcon,
  LockOpenIcon,
  MailIcon,
  PowerIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchRoles, type Role } from "@/services/access"
import { fetchDepartments, type Department } from "@/services/org"
import { resetUserTwoFactor } from "@/services/auth"
import {
  fetchLoginEvents,
  sendPasswordReset,
  setUserRoles,
  userAction,
  type AppUser,
  type LoginEvent,
  type RoleAssignmentInput,
} from "@/services/users"

type Draft = RoleAssignmentInput & { key: string }

const UserDetailsPage = () => {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const { user } = useLoaderData() as { user: AppUser }
  const revalidator = useRevalidator()
  const run = useRun()
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [events, setEvents] = useState<LoginEvent[] | null>(null)
  const [confirm, setConfirm] = useState<"deactivate" | null>(null)
  const isSelf = me?.uniqueId === user.uniqueId

  const toDraft = (u: AppUser): Draft[] =>
    u.roles.map((r) => ({
      key: `${r.roleUniqueId}:${r.contextUniqueId ?? ""}`,
      roleUniqueId: r.roleUniqueId,
      contextUniqueId: r.contextUniqueId ?? undefined,
    }))
  const [draft, setDraft] = useState<Draft[]>(toDraft(user))
  // Reset the draft when the loader returns a fresh user (after a save).
  const [draftBase, setDraftBase] = useState(user)
  if (draftBase !== user) {
    setDraftBase(user)
    setDraft(toDraft(user))
  }

  const canAssign = hasPermission(me, P.USER_ASSIGN_ROLE) && !isSelf
  const canManage = hasPermission(me, P.USER_MANAGE)

  useEffect(() => {
    void fetchRoles().then((r) => setRoles(r.data.filter((x) => x.isActive)))
    if (hasPermission(me, P.DEPARTMENT_VIEW)) {
      void fetchDepartments().then(setDepartments)
    }
    if (hasPermission(me, P.SECURITY_VIEW_LOGINS)) {
      void fetchLoginEvents(user.uniqueId, { limit: 20 }).then((p) =>
        setEvents(p.data)
      )
    }
  }, [me, user.uniqueId])

  const roleById = new Map(roles.map((r) => [r.uniqueId, r]))
  const dirty =
    JSON.stringify(draft.map((d) => d.key).sort()) !==
    JSON.stringify(
      toDraft(user)
        .map((d) => d.key)
        .sort()
    )
  const incomplete = draft.some(
    (d) => roleById.get(d.roleUniqueId)?.contextType && !d.contextUniqueId
  )

  const act = async (
    fn: () => Promise<unknown>,
    message: string
  ): Promise<void> => {
    if (await run(fn, message)) revalidator.revalidate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {user.employee.fullName}
            <StatusBadge status={user.status} />
          </span>
        }
        description={`${user.email} · ${user.jobTitle} · ${user.department.name}`}
        actions={
          canManage && (
            <>
              {user.status === "PENDING_ACTIVATION" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    act(
                      () => userAction("resendActivation", user.uniqueId),
                      t("users.activation_sent", "Activation link sent")
                    )
                  }
                >
                  <MailIcon />
                  {t("users.resend_activation", "Resend activation")}
                </Button>
              )}
              {user.status === "ACTIVE" &&
                hasPermission(me, P.USER_RESET_PASSWORD) && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      act(
                        () => sendPasswordReset(user.uniqueId),
                        t("users.reset_sent", "Password reset link sent")
                      )
                    }
                  >
                    <KeyRoundIcon />
                    {t("users.send_reset", "Send reset link")}
                  </Button>
                )}
              {(user.status === "LOCKED" || user.lockedUntil) && (
                <Button
                  variant="outline"
                  onClick={() =>
                    act(
                      () => userAction("unlockUser", user.uniqueId),
                      t("users.unlocked", "Account unlocked")
                    )
                  }
                >
                  <LockOpenIcon />
                  {t("users.unlock", "Unlock")}
                </Button>
              )}
              {user.status === "DEACTIVATED" ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    act(
                      () => userAction("reactivateUser", user.uniqueId),
                      t("users.reactivated", "User reactivated")
                    )
                  }
                >
                  <PowerIcon />
                  {t("users.reactivate", "Reactivate")}
                </Button>
              ) : (
                !isSelf && (
                  <Button
                    variant="destructive"
                    onClick={() => setConfirm("deactivate")}
                  >
                    <PowerIcon />
                    {t("users.deactivate", "Deactivate")}
                  </Button>
                )
              )}
            </>
          )
        }
      />

      {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
        <Alert variant="destructive">
          <AlertDescription>
            {t(
              "users.locked_until",
              "Locked after failed logins until {{time}}.",
              {
                time: formatStamp(user.lockedUntil),
              }
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("users.roles", "Roles")}</CardTitle>
            <CardDescription>
              {isSelf
                ? t(
                    "users.self_roles",
                    "Nobody can change their own roles (separation of duties)."
                  )
                : t(
                    "users.roles_hint",
                    "You can only assign roles whose permissions you hold yourself. Changing roles ends the user's sessions."
                  )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("users.no_roles", "No roles assigned.")}
              </p>
            )}
            {draft.map((d, i) => {
              const role = roleById.get(d.roleUniqueId)
              const label =
                role?.name ??
                user.roles.find((r) => r.roleUniqueId === d.roleUniqueId)
                  ?.roleName
              return (
                <div
                  key={d.key}
                  className="flex flex-wrap items-center gap-2 rounded-lg border p-2"
                >
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                  {role?.contextType === "DEPARTMENT" && (
                    <NativeSelect
                      size="sm"
                      value={d.contextUniqueId ?? ""}
                      disabled={!canAssign}
                      aria-label={t("users.context", "For department")}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  contextUniqueId: e.target.value || undefined,
                                  key: `${x.roleUniqueId}:${e.target.value}`,
                                }
                              : x
                          )
                        )
                      }
                    >
                      <NativeSelectOption value="">
                        {t("users.pick_department", "Choose department…")}
                      </NativeSelectOption>
                      {departments.map((dep) => (
                        <NativeSelectOption
                          key={dep.uniqueId}
                          value={dep.uniqueId}
                        >
                          {dep.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                  {role?.contextType === "STORE" && (
                    <Badge variant="outline">
                      {t(
                        "users.store_context_later",
                        "Per store — available with the Store module"
                      )}
                    </Badge>
                  )}
                  {canAssign && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      aria-label={t("common.remove", "Remove")}
                      onClick={() =>
                        setDraft((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              )
            })}
            {canAssign && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <NativeSelect
                  value=""
                  aria-label={t("users.add_role", "Add role")}
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) return
                    setDraft((prev) => [
                      ...prev,
                      { key: `${id}:${prev.length}`, roleUniqueId: id },
                    ])
                  }}
                >
                  <NativeSelectOption value="">
                    {t("users.add_role", "Add role…")}
                  </NativeSelectOption>
                  {roles
                    .filter(
                      (r) =>
                        r.contextType ||
                        !draft.some((d) => d.roleUniqueId === r.uniqueId)
                    )
                    .map((r) => (
                      <NativeSelectOption key={r.uniqueId} value={r.uniqueId}>
                        {r.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!dirty}
                    onClick={() => setDraft(toDraft(user))}
                  >
                    {t("common.reset", "Reset")}
                  </Button>
                  <Button
                    disabled={!dirty || incomplete}
                    onClick={() =>
                      act(
                        () =>
                          setUserRoles(
                            user.uniqueId,
                            draft.map(({ roleUniqueId, contextUniqueId }) => ({
                              roleUniqueId,
                              contextUniqueId,
                            }))
                          ),
                        t("users.roles_saved", "Roles saved")
                      )
                    }
                  >
                    {t("users.save_roles", "Save roles")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("users.account", "Account")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">
                {t("employees.employee", "Employee")}
              </dt>
              <dd>
                <Link
                  className="font-medium hover:underline"
                  to={withId(ROUTES.EMPLOYEE_DETAILS, user.employee.uniqueId)}
                >
                  {user.employee.employeeNumber}
                </Link>
              </dd>
              <dt className="text-muted-foreground">
                {t("users.last_login", "Last login")}
              </dt>
              <dd>{formatStamp(user.lastLoginAt)}</dd>
              <dt className="text-muted-foreground">
                {t("users.two_factor", "Two-factor")}
              </dt>
              <dd className="flex items-center gap-2">
                {user.twoFactorEnabled
                  ? t("common.on", "On")
                  : t("common.off", "Off")}
                {user.twoFactorEnabled && canManage && !isSelf && (
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto p-0"
                    onClick={() =>
                      act(
                        () => resetUserTwoFactor(user.uniqueId),
                        t(
                          "users.two_factor_reset",
                          "Two-factor reset. The user enrols again at next login."
                        )
                      )
                    }
                  >
                    {t("users.reset_two_factor", "Reset")}
                  </Button>
                )}
              </dd>
              <dt className="text-muted-foreground">
                {t("common.created", "Created")}
              </dt>
              <dd>{formatStamp(user.createdAt)}</dd>
            </dl>
            <div>
              <div className="mb-1.5 text-muted-foreground">
                {t("users.groups", "Groups")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.groups.length ? (
                  user.groups.map((g) => (
                    <Badge key={g.uniqueId} variant="secondary">
                      {g.name}
                    </Badge>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {events && (
        <Card>
          <CardHeader>
            <CardTitle>{t("users.login_history", "Login history")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audit.when", "When")}</TableHead>
                  <TableHead>{t("audit.event", "Event")}</TableHead>
                  <TableHead>{t("common.reason", "Reason")}</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">
                      {formatStamp(e.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.success ? "secondary" : "destructive"}>
                        {e.type.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.reason?.replaceAll("_", " ") ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={() => setConfirm(null)}
        title={t("users.deactivate_title", "Deactivate {{name}}?", {
          name: user.employee.fullName,
        })}
        description={t(
          "users.deactivate_hint",
          "Sessions end immediately and delegations to or from this user are cancelled. The account is kept and can be reactivated."
        )}
        confirmLabel={t("users.deactivate", "Deactivate")}
        destructive
        onConfirm={async () => {
          await act(
            () => userAction("deactivateUser", user.uniqueId),
            t("users.deactivated", "User deactivated")
          )
          setConfirm(null)
        }}
      />
    </div>
  )
}

export default UserDetailsPage

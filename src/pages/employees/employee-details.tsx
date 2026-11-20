import { useEffect, useState } from "react"
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  HistoryIcon,
  PencilIcon,
  TruckIcon,
  UserPlusIcon,
  UserRoundCheckIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatDay, formatStamp, toDateInput } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  EMPLOYEE_STATUSES,
  changeEmployeeStatus,
  fetchEmployeeHistory,
  removeDriverProfile,
  setDriverProfile,
  type Employee,
  type EmployeeHistoryEntry,
  type EmployeeStatus,
} from "@/services/employees"
import { createUsersFromEmployees } from "@/services/users"
import { EmployeeFormSheet } from "./employee-form"

type Dialogs = "edit" | "status" | "driver" | "user" | null

const EmployeeDetailsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { employee } = useLoaderData() as { employee: Employee }
  const revalidator = useRevalidator()
  const navigate = useNavigate()
  const run = useRun()
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [history, setHistory] = useState<EmployeeHistoryEntry[] | null>(null)

  const canManage = hasPermission(user, P.EMPLOYEE_MANAGE)
  const canDriver = hasPermission(user, P.DRIVER_PROFILE_MANAGE)
  const canCreateUser =
    hasPermission(user, P.USER_MANAGE) &&
    !employee.user &&
    employee.status === "ACTIVE"

  useEffect(() => {
    if (employee.personalVisible) {
      void fetchEmployeeHistory(employee.uniqueId).then(setHistory)
    }
  }, [employee])

  const done = () => {
    setDialog(null)
    revalidator.revalidate()
  }

  const details: [string, React.ReactNode][] = [
    [
      t("employees.number", "Employee no."),
      <span className="font-mono">{employee.employeeNumber}</span>,
    ],
    [t("employees.company_email", "Company email"), employee.companyEmail],
    [t("employees.phone", "Phone"), employee.phone ?? <Hidden />],
    [
      t("employees.gender", "Gender"),
      t(
        `employees.${employee.gender.toLowerCase()}`,
        employee.gender === "MALE" ? "Male" : "Female"
      ),
    ],
    [t("employees.department", "Department"), employee.department.name],
    [t("employees.job_title", "Job title"), employee.jobTitle.name],
    [
      t("employees.employment_type", "Employment type"),
      employee.employmentType.name,
    ],
    [t("employees.start_date", "Start date"), formatDay(employee.startDate)],
    [
      t("employees.contract_end", "Contract end date"),
      formatDay(employee.contractEndDate),
    ],
    [
      t("employees.supervisor", "Reporting supervisor"),
      employee.supervisor ? (
        <Link
          className="hover:underline"
          to={withId(ROUTES.EMPLOYEE_DETAILS, employee.supervisor.uniqueId)}
        >
          {employee.supervisor.fullName}
        </Link>
      ) : (
        "—"
      ),
    ],
    [
      t("employees.work_location", "Work location"),
      employee.workLocation ?? "—",
    ],
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {employee.fullName}
            <StatusBadge status={employee.status} />
          </span>
        }
        description={`${employee.jobTitle.name} · ${employee.department.name}`}
        actions={
          <>
            {canManage && (
              <Button variant="outline" onClick={() => setDialog("edit")}>
                <PencilIcon />
                {t("common.edit", "Edit")}
              </Button>
            )}
            {canManage && (
              <Button variant="outline" onClick={() => setDialog("status")}>
                <UserRoundCheckIcon />
                {t("employees.change_status", "Change status")}
              </Button>
            )}
            {canDriver && (
              <Button variant="outline" onClick={() => setDialog("driver")}>
                <TruckIcon />
                {t("employees.driver_profile", "Driver profile")}
              </Button>
            )}
            {canCreateUser && (
              <Button onClick={() => setDialog("user")}>
                <UserPlusIcon />
                {t("employees.create_user", "Create user")}
              </Button>
            )}
          </>
        }
      />

      {employee.status === "EXITED" && (
        <Alert>
          <AlertDescription>
            {t(
              "employees.exited_alert",
              "This employee has exited. The user account was deactivated automatically and the record is read-only except for a rehire."
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("employees.details", "Details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {(employee.skills.length > 0 ||
              employee.qualifications.length > 0 ||
              employee.professionalRoles.length > 0) && (
              <div className="mt-6 space-y-3 border-t pt-4 text-sm">
                {(
                  [
                    [t("employees.skills", "Skills"), employee.skills],
                    [
                      t("employees.qualifications", "Qualifications"),
                      employee.qualifications,
                    ],
                    [
                      t("employees.professional_roles", "Professional roles"),
                      employee.professionalRoles,
                    ],
                  ] as const
                )
                  .filter(([, v]) => v.length)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="mb-1 text-muted-foreground">{k}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {v.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("employees.user", "User account")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {employee.user ? (
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={employee.user.status} />
                  {hasPermission(user, P.USER_VIEW) && (
                    <Link
                      className="font-medium text-primary hover:underline"
                      to={withId(ROUTES.USER_DETAILS, employee.user.uniqueId)}
                    >
                      {t("employees.open_user", "Open user")}
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t(
                    "employees.no_user_hint",
                    "No user account. Only employees who act in the system need one."
                  )}
                </p>
              )}
            </CardContent>
          </Card>
          {employee.driverProfile && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employees.driver_profile", "Driver profile")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">
                    {t("employees.licence_number", "Licence no.")}
                  </dt>
                  <dd className="font-mono">
                    {employee.driverProfile.licenceNumber}
                  </dd>
                  <dt className="text-muted-foreground">
                    {t("employees.licence_class", "Class")}
                  </dt>
                  <dd>{employee.driverProfile.licenceClass}</dd>
                  <dt className="text-muted-foreground">
                    {t("employees.licence_expiry", "Expiry")}
                  </dt>
                  <dd>
                    {formatDay(employee.driverProfile.licenceExpiry)}
                    {new Date(employee.driverProfile.licenceExpiry) <
                      new Date() && (
                      <Badge variant="destructive" className="ml-2">
                        {t("employees.expired", "Expired")}
                      </Badge>
                    )}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {employee.personalVisible && history && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="size-4" />
              {t("employees.history", "History")}
            </CardTitle>
            <CardDescription>
              {t(
                "employees.history_hint",
                "Changes of department, job title, supervisor, employment type, status and email."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("employees.no_history", "No changes recorded yet.")}
              </p>
            ) : (
              <ol className="relative space-y-4 border-l pl-6">
                {history.map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                    <div className="font-medium">
                      {t(`history.${h.field}`, h.field)}:{" "}
                      <span className="text-muted-foreground line-through">
                        {h.oldValue ?? "—"}
                      </span>{" "}
                      → {h.newValue ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("employees.effective", "Effective {{date}}", {
                        date: formatDay(h.effectiveDate),
                      })}
                      {h.changedBy && ` · ${h.changedBy}`} ·{" "}
                      {formatStamp(h.createdAt)}
                    </div>
                    {h.reason && <div className="mt-0.5">{h.reason}</div>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      {dialog === "edit" && (
        <EmployeeFormSheet
          employee={employee}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog === "status" && (
        <StatusDialog
          employee={employee}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog === "driver" && (
        <DriverDialog
          employee={employee}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog === "user" && (
        <ConfirmDialog
          open
          onOpenChange={() => setDialog(null)}
          title={t(
            "employees.create_user_title",
            "Create a user for {{name}}?",
            {
              name: employee.fullName,
            }
          )}
          description={t(
            "employees.create_user_hint",
            "The login email will be {{email}}. An activation link (valid 24 hours) is emailed so they set their own password. Assign roles on the user page.",
            { email: employee.companyEmail }
          )}
          confirmLabel={t("employees.create_user", "Create user")}
          onConfirm={async () => {
            let createdId: string | undefined
            const ok = await run(
              async () => {
                const r = await createUsersFromEmployees(
                  [employee.uniqueId],
                  []
                )
                createdId = r.created[0]?.uniqueId
                if (!createdId)
                  throw new Error(
                    t(
                      "employees.user_not_created",
                      "The user could not be created."
                    )
                  )
              },
              t(
                "employees.user_created",
                "User created and activation link sent"
              )
            )
            if (ok && createdId)
              navigate(withId(ROUTES.USER_DETAILS, createdId))
          }}
        />
      )}
    </div>
  )
}

function Hidden() {
  const { t } = useTranslation()
  return (
    <span className="text-xs font-normal text-muted-foreground italic">
      {t("employees.personal_hidden", "Hidden (personal field)")}
    </span>
  )
}

function StatusDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const canExit = hasPermission(user, P.EMPLOYEE_EXIT)
  const isRehire = employee.status === "EXITED"
  const options = isRehire
    ? (["ACTIVE"] as EmployeeStatus[])
    : EMPLOYEE_STATUSES.filter(
        (s) => s !== employee.status && (s !== "EXITED" || canExit)
      )
  const [status, setStatus] = useState<EmployeeStatus>(options[0])
  const [reason, setReason] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(
    toDateInput(new Date().toISOString())
  )
  const [newStartDate, setNewStartDate] = useState("")

  const effects: Record<EmployeeStatus, string> = {
    ACTIVE: isRehire
      ? t(
          "employees.effect_rehire",
          "Rehire: same employee number; the same user is reactivated, but roles must be assigned again."
        )
      : t("employees.effect_active", "Normal access and assignments."),
    ON_LEAVE: t(
      "employees.effect_leave",
      "Can still log in; unavailable for crew assignment; approvals follow delegation or acting HOD."
    ),
    SUSPENDED: t(
      "employees.effect_suspended",
      "Login blocked and sessions ended; cannot be assigned or receive new items."
    ),
    EXITED: t(
      "employees.effect_exited",
      "User deactivated automatically, sessions ended, delegations cancelled; exit clearance starts."
    ),
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("employees.change_status", "Change status")}
          </DialogTitle>
          <DialogDescription>{employee.fullName}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="st-status">
              {t("common.new_status", "New status")}
            </FieldLabel>
            <NativeSelect
              id="st-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
            >
              {options.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {t(`status.${s}`, s.replace("_", " ").toLowerCase())}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Alert
            variant={
              status === "EXITED" || status === "SUSPENDED"
                ? "destructive"
                : "default"
            }
          >
            <AlertDescription>{effects[status]}</AlertDescription>
          </Alert>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="st-eff">
                {t("employees.effective_date", "Effective date")}
              </FieldLabel>
              <Input
                id="st-eff"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </Field>
            {isRehire && (
              <Field>
                <FieldLabel htmlFor="st-start">
                  {t("employees.new_start_date", "New start date")}
                </FieldLabel>
                <Input
                  id="st-start"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </Field>
            )}
          </div>
          <Field>
            <FieldLabel htmlFor="st-reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Textarea
              id="st-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            variant={status === "EXITED" ? "destructive" : "default"}
            disabled={reason.trim().length < 3 || (isRehire && !newStartDate)}
            onClick={async () => {
              const ok = await run(
                () =>
                  changeEmployeeStatus({
                    uniqueId: employee.uniqueId,
                    status,
                    reason: reason.trim(),
                    effectiveDate: effectiveDate || undefined,
                    newStartDate: newStartDate || undefined,
                  }),
                t("common.saved", "Saved")
              )
              if (ok) onSaved()
            }}
          >
            {t("common.confirm", "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DriverDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const p = employee.driverProfile
  const [licenceNumber, setNumber] = useState(p?.licenceNumber ?? "")
  const [licenceClass, setClass] = useState(p?.licenceClass ?? "")
  const [licenceExpiry, setExpiry] = useState(toDateInput(p?.licenceExpiry))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("employees.driver_profile", "Driver profile")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "employees.driver_hint",
              "Drivers are employees with a valid licence. An expired licence blocks transport allocation."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dr-no">
              {t("employees.licence_number", "Licence no.")}
            </FieldLabel>
            <Input
              id="dr-no"
              value={licenceNumber}
              onChange={(e) => setNumber(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="dr-class">
                {t("employees.licence_class", "Class")}
              </FieldLabel>
              <Input
                id="dr-class"
                value={licenceClass}
                onChange={(e) => setClass(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dr-exp">
                {t("employees.licence_expiry", "Expiry")}
              </FieldLabel>
              <Input
                id="dr-exp"
                type="date"
                value={licenceExpiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter className="sm:justify-between">
          {p ? (
            <Button
              variant="destructive"
              onClick={async () => {
                if (await run(() => removeDriverProfile(employee.uniqueId)))
                  onSaved()
              }}
            >
              {t("employees.remove_driver", "Remove profile")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("actions.cancel", "Cancel")}
            </Button>
            <Button
              disabled={
                licenceNumber.length < 3 || !licenceClass || !licenceExpiry
              }
              onClick={async () => {
                const ok = await run(
                  () =>
                    setDriverProfile({
                      employeeUniqueId: employee.uniqueId,
                      licenceNumber,
                      licenceClass,
                      licenceExpiry,
                    }),
                  t("common.saved", "Saved")
                )
                if (ok) onSaved()
              }}
            >
              {t("common.save", "Save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EmployeeDetailsPage

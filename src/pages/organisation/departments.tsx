import { useEffect, useMemo, useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import {
  MoreHorizontalIcon,
  PlusIcon,
  UserRoundCogIcon,
  CornerDownRightIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { employeeOption, searchEmployeeOptions } from "@/components/app/pickers"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatDay } from "@/lib/format"
import {
  cancelActingAssignment,
  createActingAssignment,
  createDepartment,
  fetchActingAssignments,
  setDepartmentActive,
  setDepartmentPerson,
  updateDepartment,
  type ActingAssignment,
  type Department,
} from "@/services/org"

type Dialogs =
  | { kind: "edit"; department: Department | null }
  | { kind: "person"; role: "head" | "deputy"; department: Department }
  | { kind: "acting"; department: Department }
  | { kind: "toggle"; department: Department }
  | null

const DepartmentsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { departments } = useLoaderData() as { departments: Department[] }
  const revalidator = useRevalidator()
  const [showInactive, setShowInactive] = useState(false)
  const [dialog, setDialog] = useState<Dialogs>(null)
  const canManage = hasPermission(user, P.DEPARTMENT_MANAGE)
  const run = useRun()

  const done = () => {
    setDialog(null)
    revalidator.revalidate()
  }

  // Departments first, each followed by its sections.
  const rows = useMemo(() => {
    const visible = departments.filter((d) => showInactive || d.isActive)
    const top = visible.filter((d) => !d.parent)
    const out: { d: Department; depth: number }[] = []
    for (const parent of top) {
      out.push({ d: parent, depth: 0 })
      for (const child of visible.filter(
        (c) => c.parent?.uniqueId === parent.uniqueId
      )) {
        out.push({ d: child, depth: 1 })
      }
    }
    // Sections whose parent is hidden still show.
    for (const orphan of visible.filter(
      (d) => d.parent && !top.some((p) => p.uniqueId === d.parent!.uniqueId)
    )) {
      out.push({ d: orphan, depth: 1 })
    }
    return out
  }, [departments, showInactive])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("departments.title", "Departments")}
        description={t(
          "departments.subtitle",
          "Departments and their sections, Heads of Department, deputies and acting HODs."
        )}
        actions={
          canManage && (
            <Button
              onClick={() => setDialog({ kind: "edit", department: null })}
            >
              <PlusIcon />
              {t("departments.new", "New department")}
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive">
              {t("common.show_inactive", "Show inactive")}
            </Label>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("departments.department", "Department")}
                  </TableHead>
                  <TableHead>
                    {t("departments.hod", "Head of Department")}
                  </TableHead>
                  <TableHead>{t("departments.deputy", "Deputy")}</TableHead>
                  <TableHead className="text-right">
                    {t("departments.employees", "Employees")}
                  </TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ d, depth }) => (
                  <TableRow key={d.uniqueId}>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: depth * 20 }}
                      >
                        {depth > 0 && (
                          <CornerDownRightIcon className="size-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium">{d.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {d.code}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.actingHead ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            {d.actingHead.employee.fullName}
                            <Badge variant="outline">
                              {t("departments.acting", "Acting")}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("departments.until", "until {{date}}", {
                              date: formatDay(d.actingHead.to),
                            })}
                            {d.head && ` · HOD ${d.head.fullName}`}
                          </div>
                        </div>
                      ) : (
                        (d.head?.fullName ?? (
                          <span className="text-muted-foreground">—</span>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      {d.deputy?.fullName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.activeEmployeeCount}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={d.isActive} />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("common.actions", "Actions")}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({ kind: "edit", department: d })
                              }
                            >
                              {t("common.edit", "Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({
                                  kind: "person",
                                  role: "head",
                                  department: d,
                                })
                              }
                            >
                              {t("departments.set_hod", "Set HOD")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({
                                  kind: "person",
                                  role: "deputy",
                                  department: d,
                                })
                              }
                            >
                              {t("departments.set_deputy", "Set deputy")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({ kind: "acting", department: d })
                              }
                            >
                              <UserRoundCogIcon />
                              {t("departments.acting_hods", "Acting HODs")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant={d.isActive ? "destructive" : "default"}
                              onClick={() =>
                                setDialog({ kind: "toggle", department: d })
                              }
                            >
                              {d.isActive
                                ? t("common.deactivate", "Deactivate")
                                : t("common.activate", "Activate")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {dialog?.kind === "edit" && (
        <DepartmentDialog
          department={dialog.department}
          parents={departments.filter(
            (d) =>
              !d.parent &&
              d.isActive &&
              d.uniqueId !== dialog.department?.uniqueId
          )}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog?.kind === "person" && (
        <PersonDialog
          role={dialog.role}
          department={dialog.department}
          onClose={() => setDialog(null)}
          onSaved={done}
        />
      )}
      {dialog?.kind === "acting" && (
        <ActingDialog
          department={dialog.department}
          onClose={() => {
            setDialog(null)
            revalidator.revalidate()
          }}
        />
      )}
      {dialog?.kind === "toggle" && (
        <ConfirmDialog
          open
          onOpenChange={() => setDialog(null)}
          title={
            dialog.department.isActive
              ? t("departments.deactivate_title", "Deactivate {{name}}?", {
                  name: dialog.department.name,
                })
              : t("departments.activate_title", "Activate {{name}}?", {
                  name: dialog.department.name,
                })
          }
          description={
            dialog.department.isActive
              ? t(
                  "departments.deactivate_hint",
                  "Only possible when it has no active employees or sections. It is kept on record and can be reactivated."
                )
              : undefined
          }
          confirmLabel={
            dialog.department.isActive
              ? t("common.deactivate", "Deactivate")
              : t("common.activate", "Activate")
          }
          destructive={dialog.department.isActive}
          onConfirm={async () => {
            const ok = await run(() =>
              setDepartmentActive(
                dialog.department.uniqueId,
                !dialog.department.isActive
              )
            )
            if (ok) done()
          }}
        />
      )}
    </div>
  )
}

function DepartmentDialog({
  department,
  parents,
  onClose,
  onSaved,
}: {
  department: Department | null
  parents: Department[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState(department?.code ?? "")
  const [name, setName] = useState(department?.name ?? "")
  const [parent, setParent] = useState(department?.parent?.uniqueId ?? "")
  const [busy, setBusy] = useState(false)
  const isNew = department === null

  async function save() {
    setBusy(true)
    const ok = await run(
      () =>
        isNew
          ? createDepartment({
              code: code.trim().toUpperCase(),
              name: name.trim(),
              parentUniqueId: parent || undefined,
            })
          : updateDepartment({
              uniqueId: department.uniqueId,
              name: name.trim(),
              ...(parent
                ? { parentUniqueId: parent }
                : { clearParent: !!department.parent }),
            }),
      t("common.saved", "Saved")
    )
    setBusy(false)
    if (ok) onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? t("departments.new", "New department")
              : t("departments.edit", "Edit department")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "departments.levels_hint",
              "Two levels only: a department, or a section under a department."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dept-code">
              {t("common.code", "Code")}
            </FieldLabel>
            <Input
              id="dept-code"
              value={code}
              disabled={!isNew}
              placeholder="CAM"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-name">
              {t("common.name", "Name")}
            </FieldLabel>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dept-parent">
              {t("departments.parent", "Part of (optional)")}
            </FieldLabel>
            <NativeSelect
              id="dept-parent"
              className="w-full"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            >
              <NativeSelectOption value="">
                {t("departments.top_level", "— Top-level department —")}
              </NativeSelectOption>
              {parents.map((p) => (
                <NativeSelectOption key={p.uniqueId} value={p.uniqueId}>
                  {p.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={busy || code.trim().length < 2 || name.trim().length < 2}
            onClick={save}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PersonDialog({
  role,
  department,
  onClose,
  onSaved,
}: {
  role: "head" | "deputy"
  department: Department
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const current = role === "head" ? department.head : department.deputy
  const [selected, setSelected] = useState<PickerOption | null>(
    current ? employeeOption(current) : null
  )
  const search = useMemo(() => searchEmployeeOptions(), [])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role === "head"
              ? t("departments.set_hod_of", "Head of {{name}}", {
                  name: department.name,
                })
              : t("departments.set_deputy_of", "Deputy of {{name}}", {
                  name: department.name,
                })}
          </DialogTitle>
          <DialogDescription>
            {role === "head"
              ? t(
                  "departments.hod_hint",
                  "The HOD is part of the department record (changes are kept in history). The HOD's user still needs a role such as “Head of Department” for the permissions."
                )
              : t(
                  "departments.deputy_hint",
                  "The deputy acts only through an acting-HOD period or a delegation, never automatically."
                )}
          </DialogDescription>
        </DialogHeader>
        <AsyncPicker
          selected={selected}
          onChange={setSelected}
          search={search}
          placeholder={t("employees.pick", "Choose an employee")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            onClick={async () => {
              const ok = await run(
                () =>
                  setDepartmentPerson(
                    role,
                    department.uniqueId,
                    selected?.value ?? null
                  ),
                t("common.saved", "Saved")
              )
              if (ok) onSaved()
            }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActingDialog({
  department,
  onClose,
}: {
  department: Department
  onClose: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [items, setItems] = useState<ActingAssignment[] | null>(null)
  const [selected, setSelected] = useState<PickerOption | null>(
    department.deputy ? employeeOption(department.deputy) : null
  )
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("")
  const search = useMemo(() => searchEmployeeOptions(), [])

  const load = () => {
    void fetchActingAssignments(department.uniqueId).then(setItems)
  }
  useEffect(load, [department.uniqueId])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("departments.acting_of", "Acting HODs — {{name}}", {
              name: department.name,
            })}
          </DialogTitle>
          <DialogDescription>
            {t(
              "departments.acting_hint",
              "While a period is in force, HOD approvals and assignee rules go to the acting HOD."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-56 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.employee", "Employee")}</TableHead>
                <TableHead>{t("common.period", "Period")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {t("departments.no_acting", "No acting HOD periods yet.")}
                  </TableCell>
                </TableRow>
              )}
              {items?.map((a) => (
                <TableRow key={a.uniqueId}>
                  <TableCell>
                    {a.employee.fullName}
                    {a.reason && (
                      <div className="text-xs text-muted-foreground">
                        {a.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDay(a.from)} – {formatDay(a.to)}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (
                            await run(() => cancelActingAssignment(a.uniqueId))
                          )
                            load()
                        }}
                      >
                        {t("actions.cancel", "Cancel")}
                      </Button>
                    ) : (
                      <Badge variant="outline">
                        {t("common.cancelled", "Cancelled")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <FieldGroup className="rounded-md border p-4">
          <div className="text-sm font-medium">
            {t("departments.add_acting", "Add an acting period")}
          </div>
          <AsyncPicker
            selected={selected}
            onChange={setSelected}
            search={search}
            placeholder={t("employees.pick", "Choose an employee")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="acting-from">
                {t("common.from", "From")}
              </FieldLabel>
              <Input
                id="acting-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="acting-to">
                {t("common.to", "To")}
              </FieldLabel>
              <Input
                id="acting-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          <Textarea
            placeholder={t("common.reason_optional", "Reason (optional)")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div>
            <Button
              disabled={!selected || !from || !to}
              onClick={async () => {
                const ok = await run(
                  () =>
                    createActingAssignment({
                      departmentUniqueId: department.uniqueId,
                      employeeUniqueId: selected!.value,
                      from,
                      to,
                      reason: reason || undefined,
                    }),
                  t("common.saved", "Saved")
                )
                if (ok) {
                  setFrom("")
                  setTo("")
                  setReason("")
                  load()
                }
              }}
            >
              {t("common.add", "Add")}
            </Button>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentsPage

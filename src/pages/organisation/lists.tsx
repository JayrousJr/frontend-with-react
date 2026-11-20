import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import {
  createLookup,
  setLookupActive,
  updateLookup,
  type EmploymentType,
  type JobTitle,
} from "@/services/org"

type Kind = "JobTitle" | "EmploymentType"
type Row = JobTitle & { requiresEndDate?: boolean }

const ListsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { jobTitles, employmentTypes } = useLoaderData() as {
    jobTitles: JobTitle[]
    employmentTypes: EmploymentType[]
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("lists.title", "Job titles & employment types")}
        description={t(
          "lists.subtitle",
          "Configurable lists used on employee records and in the import template."
        )}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {hasPermission(user, P.JOB_TITLE_MANAGE) && (
          <LookupCard
            kind="JobTitle"
            title={t("lists.job_titles", "Job titles")}
            rows={jobTitles}
          />
        )}
        {hasPermission(user, P.EMPLOYMENT_TYPE_MANAGE) && (
          <LookupCard
            kind="EmploymentType"
            title={t("lists.employment_types", "Employment types")}
            description={t(
              "lists.employment_types_hint",
              "Types that require an end date (Contract, Intern) make the contract end date mandatory."
            )}
            rows={employmentTypes}
          />
        )}
      </div>
    </div>
  )
}

function LookupCard({
  kind,
  title,
  description,
  rows,
}: {
  kind: Kind
  title: string
  description?: string
  rows: Row[]
}) {
  const { t } = useTranslation()
  const run = useRun()
  const revalidator = useRevalidator()
  const [editing, setEditing] = useState<Row | "new" | null>(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon />
          {t("common.add", "Add")}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.code", "Code")}</TableHead>
              <TableHead>{t("common.name", "Name")}</TableHead>
              <TableHead>{t("common.active", "Active")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.uniqueId}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell>
                  {r.name}
                  {r.requiresEndDate && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("lists.requires_end", "end date required")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={r.isActive}
                    aria-label={t("common.active", "Active")}
                    onCheckedChange={async (v) => {
                      if (await run(() => setLookupActive(kind, r.uniqueId, v)))
                        revalidator.revalidate()
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.edit", "Edit")}
                    onClick={() => setEditing(r)}
                  >
                    <PencilIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {editing && (
        <LookupDialog
          kind={kind}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            revalidator.revalidate()
          }}
        />
      )}
    </Card>
  )
}

function LookupDialog({
  kind,
  row,
  onClose,
  onSaved,
}: {
  kind: Kind
  row: Row | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [code, setCode] = useState(row?.code ?? "")
  const [name, setName] = useState(row?.name ?? "")
  const [requiresEndDate, setRequiresEndDate] = useState(
    row?.requiresEndDate ?? false
  )
  const isEmployment = kind === "EmploymentType"

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? t("common.edit", "Edit") : t("common.add", "Add")}
          </DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="lk-code">
              {t("common.code", "Code")}
            </FieldLabel>
            <Input
              id="lk-code"
              value={code}
              disabled={!!row}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lk-name">
              {t("common.name", "Name")}
            </FieldLabel>
            <Input
              id="lk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {isEmployment && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="lk-end"
                checked={requiresEndDate}
                onCheckedChange={(v) => setRequiresEndDate(v === true)}
              />
              <Label htmlFor="lk-end">
                {t("lists.requires_end_label", "Requires a contract end date")}
              </Label>
            </div>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={code.length < 2 || name.trim().length < 2}
            onClick={async () => {
              const extra = isEmployment ? { requiresEndDate } : {}
              const ok = await run(
                () =>
                  row
                    ? updateLookup(kind, {
                        uniqueId: row.uniqueId,
                        name: name.trim(),
                        ...extra,
                      })
                    : createLookup(kind, { code, name: name.trim(), ...extra }),
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

export default ListsPage

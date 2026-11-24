import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import {
  addUnavailability,
  fetchUnavailability,
  fetchUnavailabilityEmployees,
  removeUnavailability,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable } from "./ui"
import { useLoad } from "./utils"

/** Module 02: recorded commitments that block crew assignment (warning). */
const UnavailabilityPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const rows = useLoad(fetchUnavailability)
  const emps = useLoad(fetchUnavailabilityEmployees)
  const [f, setF] = useState<{
    employeeId: string
    fromDate: string
    toDate: string
    reason: string
  } | null>(null)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("unavailability.title", "Staff unavailability")}
        description={t(
          "unavailability.subtitle",
          "Leave, training or other commitments of your staff. Crew assignment in these dates shows a conflict. Employee status (on leave, suspended) is checked too."
        )}
        actions={
          <Button
            onClick={() =>
              setF({ employeeId: "", fromDate: "", toDate: "", reason: "" })
            }
          >
            <PlusIcon />
            {t("unavailability.add", "Record unavailability")}
          </Button>
        }
      />
      <Section title={t("unavailability.list", "Current and upcoming")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("unavailability.employee", "Employee"),
              t("productions.department", "Department"),
              t("unavailability.from", "From"),
              t("unavailability.to", "To"),
              t("common.reason", "Reason"),
              "",
            ]}
            rows={rows.data.map((r) => [
              r.employee,
              r.department,
              formatStamp(r.fromDate),
              formatStamp(r.toDate),
              r.reason,
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  run(async () => {
                    await removeUnavailability(r.uniqueId)
                    rows.reload()
                  })
                }
              >
                <Trash2Icon />
              </Button>,
            ])}
            empty={t("unavailability.none", "Nothing recorded.")}
          />
        )}
      </Section>
      {f && (
        <FormDialog
          title={t("unavailability.add", "Record unavailability")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!f.employeeId && !!f.fromDate && !!f.toDate && !!f.reason.trim()
          }
          onClose={() => setF(null)}
          onConfirm={async () => {
            const ok = await run(
              () =>
                addUnavailability({ ...f, employeeId: Number(f.employeeId) }),
              t("common.saved", "Saved")
            )
            if (ok) rows.reload()
            return ok
          }}
        >
          <NativeSelect
            className="w-full"
            value={f.employeeId}
            onChange={(e) => setF({ ...f, employeeId: e.target.value })}
          >
            <NativeSelectOption value="">
              {t("unavailability.employee", "Employee")}
            </NativeSelectOption>
            {emps.data?.map((e) => (
              <NativeSelectOption
                key={e.employeeId}
                value={String(e.employeeId)}
              >
                {e.name} ({e.employeeNumber}) · {e.department}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("unavailability.from", "From")}</FieldLabel>
              <Input
                type="date"
                value={f.fromDate}
                onChange={(e) => setF({ ...f, fromDate: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("unavailability.to", "To")}</FieldLabel>
              <Input
                type="date"
                value={f.toDate}
                onChange={(e) => setF({ ...f, toDate: e.target.value })}
              />
            </Field>
          </div>
          <Input
            placeholder={t("common.reason", "Reason")}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default UnavailabilityPage

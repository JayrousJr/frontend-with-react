import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2Icon,
  PlusIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  addChecklistItem,
  confirmDepartment,
  fetchChecklist,
  requestReadiness,
  updateChecklistItem,
  type ChecklistItem,
  type ChecklistKind,
  type ChecklistStatus,
  type Production,
} from "@/services/production"
import { Bar, FileUpload, Files, FormDialog, Loading, Section } from "./ui"
import { fromLocal, useLoad } from "./utils"

const STATUSES: ChecklistStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_APPLICABLE",
  "BLOCKED",
]

export function ChecklistTab({
  p,
  kind,
  onStatus,
}: {
  p: Production
  kind: ChecklistKind
  onStatus: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const c = useLoad(
    () => fetchChecklist(p.uniqueId, kind),
    [p.uniqueId, kind, p.status]
  )
  const [edit, setEdit] = useState<{
    item: ChecklistItem
    status: ChecklistStatus
    comment: string
    files: UploadedFile[]
  } | null>(null)
  const [add, setAdd] = useState<{
    text: string
    departmentId: string
    critical: boolean
    dueAt: string
  } | null>(null)
  const [ready, setReady] = useState<string | null>(null)
  if (!c.data) return <Loading error={c.error} />
  const d = c.data
  if (!d.total)
    return (
      <p className="text-sm text-muted-foreground">
        {kind === "READINESS"
          ? t(
              "checklist.none_ready",
              "The readiness checklist is created when the production is scheduled."
            )
          : t(
              "checklist.none_close",
              "The closure checklist is created when the production is completed."
            )}
      </p>
    )
  return (
    <div className="space-y-6">
      <Section
        title={
          kind === "READINESS"
            ? t("checklist.readiness", "Readiness {{p}}%", { p: d.percent })
            : t("checklist.closure", "Closure checklist {{p}}%", {
                p: d.percent,
              })
        }
        description={t(
          "checklist.hint",
          "Items marked automatic complete themselves from crew, bookings, transport, running order, documents, returns, trips, attendance and incidents."
        )}
        actions={
          <>
            {d.approval && (
              <Button asChild size="sm" variant="outline">
                <Link to={withId(ROUTES.APPROVAL_DETAILS, d.approval.uniqueId)}>
                  {t("checklist.decision", "Decision")}:{" "}
                  <ToneBadge code={d.approval.status} />
                </Link>
              </Button>
            )}
            {p.status !== "CLOSED" && p.isProducer && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAdd({
                    text: "",
                    departmentId: "",
                    critical: false,
                    dueAt: "",
                  })
                }
              >
                <PlusIcon />
                {t("checklist.add", "Add item")}
              </Button>
            )}
            {d.canRequestReady && (
              <Button size="sm" onClick={() => setReady("")}>
                <ShieldCheckIcon />
                {t("checklist.request_ready", "Ask for readiness decision")}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <Bar percent={d.percent} />
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              {d.done}/{d.total} {t("checklist.done", "done")}
            </span>
            {d.blocked > 0 && (
              <span className="text-destructive">
                {d.blocked} {t("checklist.blocked", "blocked")}
              </span>
            )}
            {d.overdue > 0 && (
              <span className="text-amber-700">
                {d.overdue} {t("checklist.overdue", "overdue")}
              </span>
            )}
            {d.criticalOpen.length > 0 && (
              <span className="text-destructive">
                {t("checklist.critical_open", "Critical open")}:{" "}
                {d.criticalOpen.join(", ")}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.departments.map((x) => (
              <div key={x.name} className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{x.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {x.done}/{x.total}
                  </span>
                </div>
                <Bar percent={x.percent} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("checklist.confirmations", "Department confirmations")}>
        <ul className="space-y-2 text-sm">
          {d.confirmations.map((x) => (
            <li
              key={x.departmentId}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="font-medium">{x.name}</span>
              {x.confirmedAt ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2Icon className="size-4" />
                  {formatStamp(x.confirmedAt)}
                </span>
              ) : (
                <ToneBadge code="PENDING" />
              )}
              {x.canConfirm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run(
                      async () =>
                        c.set(
                          await confirmDepartment(
                            p.uniqueId,
                            kind,
                            x.departmentId
                          )
                        ),
                      t("checklist.confirmed", "Confirmed")
                    )
                  }
                >
                  {kind === "READINESS"
                    ? t("checklist.confirm_ready", "Confirm ready")
                    : t("checklist.confirm_done", "Confirm completed")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("checklist.items", "Items")}>
        <div className="divide-y">
          {d.items.map((i) => (
            <div
              key={i.uniqueId}
              className="flex flex-wrap items-start gap-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.text}</span>
                  {i.critical && <ToneBadge code="CRITICAL" />}
                  {i.auto && (
                    <span className="flex items-center gap-1 text-xs text-sky-700">
                      <ZapIcon className="size-3" />
                      {t("checklist.auto", "automatic")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {i.department}
                  {i.dueAt &&
                    ` · ${t("checklist.due", "due")} ${formatStamp(i.dueAt)}`}
                  {i.overdue && (
                    <span className="text-amber-700">
                      {" "}
                      · {t("checklist.overdue", "overdue")}
                    </span>
                  )}
                  {i.detail && ` · ${i.detail}`}
                </div>
                {i.comment && (
                  <div className="text-xs">
                    “{i.comment}” {i.updatedBy && `— ${i.updatedBy}`}
                  </div>
                )}
                <Files files={i.files} />
              </div>
              <ToneBadge code={i.status} />
              {i.canUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEdit({
                      item: i,
                      status: i.status,
                      comment: i.comment ?? "",
                      files: [],
                    })
                  }
                >
                  {t("actions.update", "Update")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {edit && (
        <FormDialog
          title={edit.item.text}
          description={
            edit.item.auto
              ? t(
                  "checklist.auto_hint",
                  "Automatic item: you can only mark it not applicable or blocked (with a reason), or back to pending."
                )
              : undefined
          }
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !["BLOCKED", "NOT_APPLICABLE"].includes(edit.status) ||
            !!edit.comment.trim()
          }
          onClose={() => setEdit(null)}
          onConfirm={() =>
            run(async () =>
              c.set(
                await updateChecklistItem(edit.item.uniqueId, {
                  status: edit.status,
                  comment: edit.comment || null,
                  fileUniqueIds: edit.files.map((f) => f.uniqueId),
                })
              )
            )
          }
        >
          <NativeSelect
            className="w-full"
            value={edit.status}
            onChange={(e) =>
              setEdit({ ...edit, status: e.target.value as ChecklistStatus })
            }
          >
            {STATUSES.filter(
              (s) =>
                !edit.item.auto ||
                ["PENDING", "NOT_APPLICABLE", "BLOCKED"].includes(s)
            ).map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`codes.${s}`, s)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Textarea
            rows={3}
            placeholder={t("checklist.comment", "Comment / issue")}
            value={edit.comment}
            onChange={(e) => setEdit({ ...edit, comment: e.target.value })}
          />
          <FileUpload
            folder="production"
            files={edit.files}
            onChange={(files) => setEdit({ ...edit, files })}
          />
        </FormDialog>
      )}

      {add && (
        <FormDialog
          title={t("checklist.add", "Add item")}
          confirmLabel={t("checklist.add", "Add item")}
          canConfirm={!!add.text.trim()}
          onClose={() => setAdd(null)}
          onConfirm={() =>
            run(async () =>
              c.set(
                await addChecklistItem(p.uniqueId, kind, {
                  text: add.text,
                  departmentId: add.departmentId
                    ? Number(add.departmentId)
                    : null,
                  critical: add.critical,
                  dueAt: fromLocal(add.dueAt),
                })
              )
            )
          }
        >
          <Input
            placeholder={t("checklist.item_text", "What must be done")}
            value={add.text}
            onChange={(e) => setAdd({ ...add, text: e.target.value })}
          />
          <Field>
            <FieldLabel>{t("productions.department", "Department")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={add.departmentId}
              onChange={(e) => setAdd({ ...add, departmentId: e.target.value })}
            >
              <NativeSelectOption value="">
                {t("checklist.producer", "Producer")}
              </NativeSelectOption>
              {p.departments.map((x) => (
                <NativeSelectOption
                  key={x.departmentId}
                  value={String(x.departmentId)}
                >
                  {x.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>{t("checklist.due", "Due")}</FieldLabel>
            <Input
              type="datetime-local"
              value={add.dueAt}
              onChange={(e) => setAdd({ ...add, dueAt: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={add.critical}
              onCheckedChange={(v) => setAdd({ ...add, critical: v === true })}
            />
            {t("checklist.critical", "Critical")}
          </label>
        </FormDialog>
      )}

      {ready !== null && (
        <FormDialog
          title={t("checklist.request_ready", "Ask for readiness decision")}
          description={
            d.criticalOpen.length
              ? t(
                  "checklist.override_hint",
                  "Critical items are still open: {{items}}. Give a reason to ask for authorisation to proceed.",
                  {
                    items: d.criticalOpen.join(", "),
                  }
                )
              : t(
                  "checklist.ready_hint",
                  "The Production Manager records the final readiness decision."
                )
          }
          confirmLabel={t("checklist.send", "Send")}
          canConfirm={!d.criticalOpen.length || !!ready.trim()}
          onClose={() => setReady(null)}
          onConfirm={async () => {
            const ok = await run(
              async () => c.set(await requestReadiness(p.uniqueId, ready)),
              t("checklist.sent", "Sent to the Production Manager")
            )
            if (ok) onStatus()
            return ok
          }}
        >
          {d.criticalOpen.length > 0 && (
            <Textarea
              rows={3}
              placeholder={t("checklist.override_reason", "Reason to proceed")}
              value={ready}
              onChange={(e) => setReady(e.target.value)}
            />
          )}
        </FormDialog>
      )}
    </div>
  )
}

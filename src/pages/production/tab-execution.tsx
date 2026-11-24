import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  AlertOctagonIcon,
  CheckIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  ShuffleIcon,
  TimerIcon,
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
import { ROUTES } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  addUpdate,
  completeProduction,
  fetchConfig,
  fetchExecution,
  fetchMembers,
  reportDeviation,
  reportIncident,
  setProductionStatus,
  startProduction,
  updateIncident,
  type Incident,
  type Production,
} from "@/services/production"
import { FileUpload, Files, FormDialog, Loading, Section } from "./ui"
import { fromLocal, toLocal, useLoad } from "./utils"

type Inc = {
  category: string
  severity: string
  description: string
  departmentId: string
  occurredAt: string
  actionsTaken: string
  assigneeUserId: string
  dueAt: string
  assetUniqueId: string
  assetReportType: string
  files: UploadedFile[]
}

export function ExecutionTab({
  p,
  onStatus,
}: {
  p: Production
  onStatus: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const ex = useLoad(() => fetchExecution(p.uniqueId), [p.uniqueId])
  const cfg = useLoad(fetchConfig)
  const members = useLoad(() => fetchMembers(p.uniqueId), [p.uniqueId])
  const [reason, setReason] = useState<{
    status: "ON_HOLD" | "DELAYED"
    text: string
  } | null>(null)
  const [upd, setUpd] = useState({
    kind: "PROGRESS",
    text: "",
    departmentId: "",
    files: [] as UploadedFile[],
  })
  const [inc, setInc] = useState<Inc | null>(null)
  const [edit, setEdit] = useState<{
    i: Incident
    status: string
    actionsTaken: string
    resolution: string
    assigneeUserId: string
  } | null>(null)
  const [dev, setDev] = useState<{
    area: string
    description: string
    reason: string
    significant: boolean
  } | null>(null)
  if (!ex.data) return <Loading error={ex.error} />
  const d = ex.data
  const status = (fn: () => Promise<unknown>, ok: string) =>
    run(async () => {
      await fn()
      ex.reload()
      onStatus()
    }, ok)
  return (
    <div className="space-y-6">
      <Section
        title={t("exec.status", "Production status")}
        description={
          d.actualStartAt
            ? `${t("productions.actual_start", "Actual start")} ${formatStamp(d.actualStartAt)}${d.actualEndAt ? ` · ${t("productions.actual_end", "Actual end")} ${formatStamp(d.actualEndAt)}` : ""}`
            : t(
                "exec.not_started",
                "Not started yet. Starting needs an approved readiness decision."
              )
        }
        actions={
          <>
            {d.can.start && (
              <Button
                size="sm"
                onClick={() =>
                  status(
                    () => startProduction(p.uniqueId),
                    t("exec.started", "Production started")
                  )
                }
              >
                <PlayIcon />
                {t("exec.start", "Start production")}
              </Button>
            )}
            {d.can.hold && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReason({ status: "ON_HOLD", text: "" })}
              >
                <PauseIcon />
                {t("exec.hold", "On hold")}
              </Button>
            )}
            {d.can.delay && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReason({ status: "DELAYED", text: "" })}
              >
                <TimerIcon />
                {t("exec.delay", "Delayed")}
              </Button>
            )}
            {d.can.resume && (
              <Button
                size="sm"
                onClick={() =>
                  status(
                    () => setProductionStatus(p.uniqueId, "IN_PROGRESS"),
                    t("exec.resumed", "Resumed")
                  )
                }
              >
                <PlayIcon />
                {t("exec.resume", "Resume")}
              </Button>
            )}
            {d.can.complete && (
              <Button
                size="sm"
                onClick={() =>
                  status(
                    () => completeProduction(p.uniqueId),
                    t("exec.completed", "Production completed")
                  )
                }
              >
                <CheckIcon />
                {t("exec.complete", "Complete")}
              </Button>
            )}
          </>
        }
      >
        <ToneBadge code={d.status} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title={t("exec.incidents", "Incidents and issues")}
          actions={
            d.can.report && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setInc({
                    category: cfg.data?.incidentCategories[0] ?? "",
                    severity: "MEDIUM",
                    description: "",
                    departmentId: "",
                    occurredAt: toLocal(new Date().toISOString()),
                    actionsTaken: "",
                    assigneeUserId: "",
                    dueAt: "",
                    assetUniqueId: "",
                    assetReportType: "DAMAGE",
                    files: [],
                  })
                }
              >
                <AlertOctagonIcon />
                {t("exec.report_incident", "Report incident")}
              </Button>
            )
          }
        >
          {d.incidents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("exec.no_incidents", "No incidents.")}
            </p>
          )}
          <ul className="space-y-3">
            {d.incidents.map((i) => (
              <li key={i.uniqueId} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{i.number}</span>
                  <ToneBadge code={i.severity} />
                  <span className="font-medium">{i.category}</span>
                  <ToneBadge code={i.status} />
                  {i.canUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() =>
                        setEdit({
                          i,
                          status: i.status,
                          actionsTaken: i.actionsTaken ?? "",
                          resolution: i.resolution ?? "",
                          assigneeUserId: i.assigneeUserId
                            ? String(i.assigneeUserId)
                            : "",
                        })
                      }
                    >
                      {t("actions.update", "Update")}
                    </Button>
                  )}
                </div>
                <p>{i.description}</p>
                <div className="text-xs text-muted-foreground">
                  {formatStamp(i.occurredAt)} · {i.reportedBy}
                  {i.department && ` · ${i.department}`}
                  {i.assignee &&
                    ` · ${t("exec.follow_up", "follow-up")}: ${i.assignee}`}
                  {i.dueAt &&
                    ` · ${t("checklist.due", "due")} ${formatStamp(i.dueAt)}`}
                  {i.overdue && (
                    <span className="text-amber-700">
                      {" "}
                      · {t("checklist.overdue", "overdue")}
                    </span>
                  )}
                </div>
                {i.actionsTaken && (
                  <div className="text-xs">
                    {t("exec.actions", "Actions")}: {i.actionsTaken}
                  </div>
                )}
                {i.resolution && (
                  <div className="text-xs text-emerald-700">
                    {t("exec.resolution", "Resolution")}: {i.resolution}
                  </div>
                )}
                {i.assetReport && (
                  <Link
                    className="text-xs underline"
                    to={`${ROUTES.CUSTODY}?tab=reports`}
                  >
                    {t("exec.asset_report", "Asset report")}{" "}
                    {i.assetReport.number} (
                    {t(`codes.${i.assetReport.status}`, i.assetReport.status)})
                  </Link>
                )}
                <Files files={i.files} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={t("exec.deviations", "Deviations from the plan")}
          actions={
            d.can.deviation && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDev({
                    area: "Running order",
                    description: "",
                    reason: "",
                    significant: true,
                  })
                }
              >
                <ShuffleIcon />
                {t("exec.record_deviation", "Record deviation")}
              </Button>
            )
          }
        >
          {d.deviations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("exec.no_deviations", "No deviations.")}
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {d.deviations.map((x) => (
              <li key={x.uniqueId} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{x.area}</span>
                  <ToneBadge code={x.status} />
                  {x.significant && (
                    <span className="text-xs text-muted-foreground">
                      {t("exec.significant", "significant — approval")}
                    </span>
                  )}
                </div>
                <p>{x.description}</p>
                <div className="text-xs text-muted-foreground">
                  {t("common.reason", "Reason")}: {x.reason} · {x.requestedBy} ·{" "}
                  {formatStamp(x.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title={t("exec.updates", "Progress updates and timeline")}>
        {d.can.report && (
          <div className="mb-4 flex flex-wrap gap-2">
            <NativeSelect
              value={upd.kind}
              onChange={(e) => setUpd({ ...upd, kind: e.target.value })}
            >
              {["PROGRESS", "EVENT", "DELAY", "MILESTONE"].map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {t(`codes.${k}`, k)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={upd.departmentId}
              onChange={(e) => setUpd({ ...upd, departmentId: e.target.value })}
            >
              <NativeSelectOption value="">
                {t("exec.no_department", "No department")}
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
            <Input
              className="min-w-64 flex-1"
              placeholder={t("exec.update_text", "What happened")}
              value={upd.text}
              onChange={(e) => setUpd({ ...upd, text: e.target.value })}
            />
            <Button
              size="sm"
              disabled={!upd.text.trim()}
              onClick={() =>
                run(async () => {
                  ex.set(
                    await addUpdate(p.uniqueId, {
                      kind: upd.kind,
                      text: upd.text,
                      departmentId: upd.departmentId
                        ? Number(upd.departmentId)
                        : null,
                      fileUniqueIds: upd.files.map((f) => f.uniqueId),
                    })
                  )
                  setUpd({ ...upd, text: "", files: [] })
                })
              }
            >
              <SendIcon />
              {t("exec.post", "Post")}
            </Button>
            <div className="w-full">
              <FileUpload
                folder="production"
                files={upd.files}
                onChange={(files) => setUpd({ ...upd, files })}
              />
            </div>
          </div>
        )}
        <ul className="space-y-1 text-sm">
          {d.updates.map((u, i) => (
            <li key={i} className="flex flex-wrap gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">
                {formatStamp(u.at)}
              </span>
              <ToneBadge code={u.kind} />
              <span>{u.text}</span>
              <span className="text-muted-foreground">
                — {u.by}
                {u.department ? ` (${u.department})` : ""}
              </span>
              <Files files={u.files} />
            </li>
          ))}
        </ul>
      </Section>

      {reason && (
        <FormDialog
          title={
            reason.status === "ON_HOLD"
              ? t("exec.hold", "On hold")
              : t("exec.delay", "Delayed")
          }
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!reason.text.trim()}
          onClose={() => setReason(null)}
          onConfirm={() =>
            status(
              () => setProductionStatus(p.uniqueId, reason.status, reason.text),
              t("common.saved", "Saved")
            )
          }
        >
          <Textarea
            rows={3}
            placeholder={t("common.reason", "Reason")}
            value={reason.text}
            onChange={(e) => setReason({ ...reason, text: e.target.value })}
          />
        </FormDialog>
      )}

      {inc && cfg.data && (
        <FormDialog
          wide
          title={t("exec.report_incident", "Report incident")}
          confirmLabel={t("exec.report", "Report")}
          canConfirm={!!inc.description.trim()}
          onClose={() => setInc(null)}
          onConfirm={() =>
            run(
              async () =>
                ex.set(
                  await reportIncident(p.uniqueId, {
                    category: inc.category,
                    severity: inc.severity,
                    description: inc.description,
                    departmentId: inc.departmentId
                      ? Number(inc.departmentId)
                      : null,
                    occurredAt: fromLocal(inc.occurredAt),
                    actionsTaken: inc.actionsTaken || null,
                    assigneeUserId: inc.assigneeUserId
                      ? Number(inc.assigneeUserId)
                      : null,
                    dueAt: fromLocal(inc.dueAt),
                    fileUniqueIds: inc.files.map((f) => f.uniqueId),
                    assetUniqueId: inc.assetUniqueId || null,
                    assetReportType: inc.assetUniqueId
                      ? inc.assetReportType
                      : null,
                  })
                ),
              t("exec.reported", "Incident reported")
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("exec.category", "Category")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={inc.category}
                onChange={(e) => setInc({ ...inc, category: e.target.value })}
              >
                {cfg.data.incidentCategories.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {c}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel>{t("exec.severity", "Severity")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={inc.severity}
                onChange={(e) => setInc({ ...inc, severity: e.target.value })}
              >
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {t(`codes.${s}`, s)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel>
                {t("productions.department", "Department")}
              </FieldLabel>
              <NativeSelect
                className="w-full"
                value={inc.departmentId}
                onChange={(e) =>
                  setInc({ ...inc, departmentId: e.target.value })
                }
              >
                <NativeSelectOption value="">—</NativeSelectOption>
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
              <FieldLabel>{t("exec.occurred", "Occurred")}</FieldLabel>
              <Input
                type="datetime-local"
                value={inc.occurredAt}
                onChange={(e) => setInc({ ...inc, occurredAt: e.target.value })}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>{t("exec.description", "Description")}</FieldLabel>
              <Textarea
                rows={3}
                value={inc.description}
                onChange={(e) =>
                  setInc({ ...inc, description: e.target.value })
                }
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>{t("exec.actions", "Actions taken")}</FieldLabel>
              <Input
                value={inc.actionsTaken}
                onChange={(e) =>
                  setInc({ ...inc, actionsTaken: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel>{t("exec.follow_up", "Follow-up by")}</FieldLabel>
              <NativeSelect
                className="w-full"
                value={inc.assigneeUserId}
                onChange={(e) =>
                  setInc({ ...inc, assigneeUserId: e.target.value })
                }
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {members.data?.map((m) => (
                  <NativeSelectOption key={m.userId} value={String(m.userId)}>
                    {m.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel>{t("exec.resolve_by", "Resolve by")}</FieldLabel>
              <Input
                type="datetime-local"
                value={inc.dueAt}
                onChange={(e) => setInc({ ...inc, dueAt: e.target.value })}
              />
            </Field>
            {d.checkedOutAssets.length > 0 && (
              <>
                <Field>
                  <FieldLabel>
                    {t(
                      "exec.asset",
                      "Equipment involved (creates an asset report)"
                    )}
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    value={inc.assetUniqueId}
                    onChange={(e) =>
                      setInc({ ...inc, assetUniqueId: e.target.value })
                    }
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {d.checkedOutAssets.map((a) => (
                      <NativeSelectOption key={a.uniqueId} value={a.uniqueId}>
                        {a.tag} {a.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel>
                    {t("exec.report_type", "Report type")}
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    disabled={!inc.assetUniqueId}
                    value={inc.assetReportType}
                    onChange={(e) =>
                      setInc({ ...inc, assetReportType: e.target.value })
                    }
                  >
                    {["FAULT", "DAMAGE", "LOSS", "THEFT"].map((s) => (
                      <NativeSelectOption key={s} value={s}>
                        {t(`codes.${s}`, s)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}
          </div>
          <FileUpload
            folder="production"
            files={inc.files}
            onChange={(files) => setInc({ ...inc, files })}
          />
        </FormDialog>
      )}

      {edit && (
        <FormDialog
          title={`${edit.i.number} · ${edit.i.category}`}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={edit.status !== "RESOLVED" || !!edit.resolution.trim()}
          onClose={() => setEdit(null)}
          onConfirm={() =>
            run(async () =>
              ex.set(
                await updateIncident(edit.i.uniqueId, {
                  status: edit.status,
                  actionsTaken: edit.actionsTaken || null,
                  resolution: edit.resolution || null,
                  assigneeUserId: edit.assigneeUserId
                    ? Number(edit.assigneeUserId)
                    : null,
                })
              )
            )
          }
        >
          <NativeSelect
            className="w-full"
            value={edit.status}
            onChange={(e) => setEdit({ ...edit, status: e.target.value })}
          >
            {["OPEN", "IN_PROGRESS", "RESOLVED"].map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`codes.${s}`, s)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            value={edit.assigneeUserId}
            onChange={(e) =>
              setEdit({ ...edit, assigneeUserId: e.target.value })
            }
          >
            <NativeSelectOption value="">
              {t("exec.no_follow_up", "No follow-up person")}
            </NativeSelectOption>
            {members.data?.map((m) => (
              <NativeSelectOption key={m.userId} value={String(m.userId)}>
                {m.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            placeholder={t("exec.actions", "Actions taken")}
            value={edit.actionsTaken}
            onChange={(e) => setEdit({ ...edit, actionsTaken: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder={t("exec.resolution", "Resolution")}
            value={edit.resolution}
            onChange={(e) => setEdit({ ...edit, resolution: e.target.value })}
          />
        </FormDialog>
      )}

      {dev && (
        <FormDialog
          title={t("exec.record_deviation", "Record deviation")}
          description={t(
            "exec.deviation_hint",
            "Significant deviations need Production Manager approval."
          )}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!dev.area.trim() && !!dev.description.trim() && !!dev.reason.trim()
          }
          onClose={() => setDev(null)}
          onConfirm={() =>
            run(async () => ex.set(await reportDeviation(p.uniqueId, dev)))
          }
        >
          <NativeSelect
            className="w-full"
            value={dev.area}
            onChange={(e) => setDev({ ...dev, area: e.target.value })}
          >
            {[
              "Running order",
              "Timing",
              "Personnel",
              "Equipment",
              "Transport",
              "Venue",
              "Other",
            ].map((a) => (
              <NativeSelectOption key={a} value={a}>
                {a}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Textarea
            rows={2}
            placeholder={t("exec.description", "Description")}
            value={dev.description}
            onChange={(e) => setDev({ ...dev, description: e.target.value })}
          />
          <Input
            placeholder={t("common.reason", "Reason")}
            value={dev.reason}
            onChange={(e) => setDev({ ...dev, reason: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={dev.significant}
              onCheckedChange={(v) =>
                setDev({ ...dev, significant: v === true })
              }
            />
            {t("exec.significant_label", "Significant (needs approval)")}
          </label>
        </FormDialog>
      )}
    </div>
  )
}

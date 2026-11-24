import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  FileCheck2Icon,
  MessageSquarePlusIcon,
  PencilLineIcon,
  PrinterIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  addFeedback,
  fetchChecklist,
  fetchClosure,
  requestAmendment,
  submitClosure,
  type Production,
} from "@/services/production"
import { FormDialog, Info, Loading, Section, Stat } from "./ui"
import { ChecklistTab } from "./tab-checklist"
import { useLoad } from "./utils"

const FIELDS = {
  outcome: "Outcome",
  lessonsLearned: "Lessons learned",
  recommendations: "Recommendations",
} as const

export function ClosureTab({
  p,
  onStatus,
}: {
  p: Production
  onStatus: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const c = useLoad(() => fetchClosure(p.uniqueId), [p.uniqueId, p.status])
  const [submit, setSubmit] = useState<{
    outcome: string
    lessonsLearned: string
    recommendations: string
    exceptionReason: string
    critical: string[]
  } | null>(null)
  const [fb, setFb] = useState<{
    topic: string
    rating: string
    text: string
    departmentId: string
  } | null>(null)
  const [am, setAm] = useState<{
    field: keyof typeof FIELDS
    after: string
    reason: string
  } | null>(null)
  if (!c.data) return <Loading error={c.error} />
  const d = c.data
  const s = d.summary
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2 print:hidden">
        {d.approval && (
          <Button asChild size="sm" variant="outline">
            <Link to={withId(ROUTES.APPROVAL_DETAILS, d.approval.uniqueId)}>
              {t("closure.decision", "Closure approval")}:{" "}
              <ToneBadge code={d.approval.status} />
            </Link>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <PrinterIcon />
          {t("closure.print", "Print closure report")}
        </Button>
        {d.can.submit && (
          <Button
            size="sm"
            onClick={async () => {
              const cl = await fetchChecklist(p.uniqueId, "CLOSURE")
              setSubmit({
                outcome: d.outcome ?? "",
                lessonsLearned: d.lessonsLearned ?? "",
                recommendations: d.recommendations ?? "",
                exceptionReason: "",
                critical: cl.criticalOpen,
              })
            }}
          >
            <FileCheck2Icon />
            {t("closure.submit", "Submit for closure")}
          </Button>
        )}
      </div>

      <Section
        title={t("closure.report", "Closure report — {{n}}", { n: d.number })}
        description={`${d.title} · ${d.category} · ${d.producer}`}
      >
        <Info
          items={[
            [
              t("closure.planned", "Planned"),
              `${formatStamp(d.plannedStartAt)} – ${formatStamp(d.plannedEndAt)}`,
            ],
            [
              t("closure.actual", "Actual"),
              d.actualStartAt
                ? `${formatStamp(d.actualStartAt)} – ${formatStamp(d.actualEndAt)}`
                : "—",
            ],
            [t("productions.venues", "Venues"), d.venues.join(", ")],
            [
              t("closure.closed_at", "Closed"),
              d.closedAt ? formatStamp(d.closedAt) : null,
            ],
            [
              t("closure.exception", "Closed with exception"),
              d.closureException,
            ],
          ]}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat
            label={t("closure.crew", "Crew assigned / required")}
            value={`${s.crewAssigned}/${s.crewRequired}`}
          />
          <Stat
            label={t("closure.hours", "Hours worked")}
            value={s.hours}
            hint={`${s.approvedOvertime} h ${t("closure.ot", "approved overtime")}`}
          />
          <Stat
            label={t("closure.absent_late", "Absent / late")}
            value={`${s.absent}/${s.late}`}
          />
          <Stat
            label={t("closure.equipment", "Items returned")}
            value={s.itemsReturned}
            hint={`${s.itemsMissing} ${t("closure.missing", "missing")}, ${s.itemsDamaged} ${t("closure.damaged", "damaged")}`}
            tone={s.itemsMissing ? "bad" : undefined}
          />
          <Stat
            label={t("closure.trips", "Trips")}
            value={s.trips}
            hint={`${s.km} km · ${s.fuelLitres} L`}
          />
          <Stat
            label={t("closure.incidents", "Incidents / deviations")}
            value={`${s.incidents}/${s.deviations}`}
            hint={`${s.incidentsOpen} ${t("closure.open", "open")}`}
            tone={s.incidentsOpen ? "warn" : undefined}
          />
        </div>
        {(d.outcome || d.lessonsLearned || d.recommendations) && (
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            {(Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((k) => (
              <div key={k}>
                <div className="flex items-center gap-1 text-muted-foreground">
                  {t(`closure.${k}`, FIELDS[k])}
                  {d.can.amend && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 print:hidden"
                      onClick={() =>
                        setAm({ field: k, after: d[k] ?? "", reason: "" })
                      }
                    >
                      <PencilLineIcon />
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{d[k] ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="print:hidden">
        <ChecklistTab p={p} kind="CLOSURE" onStatus={onStatus} />
      </div>

      <Section
        title={t("closure.feedback", "Feedback and lessons")}
        actions={
          d.can.feedback && (
            <Button
              size="sm"
              variant="outline"
              className="print:hidden"
              onClick={() =>
                setFb({
                  topic: "Coordination",
                  rating: "4",
                  text: "",
                  departmentId: "",
                })
              }
            >
              <MessageSquarePlusIcon />
              {t("closure.add_feedback", "Add feedback")}
            </Button>
          )
        }
      >
        {d.feedback.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("closure.no_feedback", "No feedback yet.")}
          </p>
        )}
        <ul className="space-y-2 text-sm">
          {d.feedback.map((f, i) => (
            <li key={i}>
              <span className="font-medium">{f.topic}</span>
              {f.rating != null &&
                ` · ${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}`}{" "}
              — {f.text}
              <span className="text-xs text-muted-foreground">
                {" "}
                ({f.by}
                {f.department ? `, ${f.department}` : ""}, {formatStamp(f.at)})
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {d.amendments.length > 0 && (
        <Section title={t("closure.amendments", "Post-closure amendments")}>
          <ul className="space-y-2 text-sm">
            {d.amendments.map((a) => (
              <li key={a.uniqueId} className="rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {t(`closure.${a.field}`, a.field)}
                  </span>
                  <ToneBadge code={a.status} />
                  <span className="text-xs text-muted-foreground">
                    {a.by} · {formatStamp(a.at)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-through">
                  {a.before ?? "—"}
                </div>
                <div>{a.after}</div>
                <div className="text-xs">
                  {t("common.reason", "Reason")}: {a.reason}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {submit && (
        <FormDialog
          wide
          title={t("closure.submit", "Submit for closure")}
          description={
            submit.critical.length
              ? t(
                  "closure.exception_hint",
                  "Critical items are still open: {{items}}. Closing needs an exception with a reason.",
                  { items: submit.critical.join(", ") }
                )
              : t(
                  "closure.submit_hint",
                  "The Production Manager reviews and approves the closure. Afterwards the records are read-only."
                )
          }
          confirmLabel={t("closure.send", "Send for approval")}
          canConfirm={
            !!submit.outcome.trim() &&
            (!submit.critical.length || !!submit.exceptionReason.trim())
          }
          onClose={() => setSubmit(null)}
          onConfirm={async () => {
            const ok = await run(
              async () =>
                c.set(
                  await submitClosure(p.uniqueId, {
                    outcome: submit.outcome,
                    lessonsLearned: submit.lessonsLearned || null,
                    recommendations: submit.recommendations || null,
                    exceptionReason: submit.exceptionReason || null,
                  })
                ),
              t("closure.sent", "Sent for closure approval")
            )
            if (ok) onStatus()
            return ok
          }}
        >
          <Field>
            <FieldLabel>{t("closure.outcome", "Outcome")}</FieldLabel>
            <Textarea
              rows={3}
              value={submit.outcome}
              onChange={(e) =>
                setSubmit({ ...submit, outcome: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("closure.lessonsLearned", "Lessons learned")}
            </FieldLabel>
            <Textarea
              rows={2}
              value={submit.lessonsLearned}
              onChange={(e) =>
                setSubmit({ ...submit, lessonsLearned: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("closure.recommendations", "Recommendations")}
            </FieldLabel>
            <Textarea
              rows={2}
              value={submit.recommendations}
              onChange={(e) =>
                setSubmit({ ...submit, recommendations: e.target.value })
              }
            />
          </Field>
          {submit.critical.length > 0 && (
            <Field>
              <FieldLabel>
                {t("closure.exception_reason", "Exception reason")}
              </FieldLabel>
              <Textarea
                rows={2}
                value={submit.exceptionReason}
                onChange={(e) =>
                  setSubmit({ ...submit, exceptionReason: e.target.value })
                }
              />
            </Field>
          )}
        </FormDialog>
      )}

      {fb && (
        <FormDialog
          title={t("closure.add_feedback", "Add feedback")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={!!fb.topic.trim() && !!fb.text.trim()}
          onClose={() => setFb(null)}
          onConfirm={() =>
            run(async () =>
              c.set(
                await addFeedback(p.uniqueId, {
                  topic: fb.topic,
                  rating: fb.rating ? Number(fb.rating) : null,
                  text: fb.text,
                  departmentId: fb.departmentId
                    ? Number(fb.departmentId)
                    : null,
                })
              )
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <NativeSelect
              className="w-full"
              value={fb.topic}
              onChange={(e) => setFb({ ...fb, topic: e.target.value })}
            >
              {[
                "Coordination",
                "Crew performance",
                "Equipment availability",
                "Transport",
                "Execution",
                "Other",
              ].map((x) => (
                <NativeSelectOption key={x} value={x}>
                  {x}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              className="w-full"
              value={fb.rating}
              onChange={(e) => setFb({ ...fb, rating: e.target.value })}
            >
              <NativeSelectOption value="">
                {t("closure.no_rating", "No rating")}
              </NativeSelectOption>
              {[1, 2, 3, 4, 5].map((n) => (
                <NativeSelectOption key={n} value={String(n)}>
                  {"★".repeat(n)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              className="w-full"
              value={fb.departmentId}
              onChange={(e) => setFb({ ...fb, departmentId: e.target.value })}
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
          </div>
          <Textarea
            rows={3}
            value={fb.text}
            onChange={(e) => setFb({ ...fb, text: e.target.value })}
          />
        </FormDialog>
      )}

      {am && (
        <FormDialog
          title={t("closure.amend", "Request amendment: {{f}}", {
            f: FIELDS[am.field],
          })}
          description={t(
            "closure.amend_hint",
            "The Production Manager approves; the original stays in the history."
          )}
          confirmLabel={t("closure.send", "Send for approval")}
          canConfirm={!!am.after.trim() && !!am.reason.trim()}
          onClose={() => setAm(null)}
          onConfirm={() =>
            run(
              async () => c.set(await requestAmendment(p.uniqueId, am)),
              t("closure.amend_sent", "Amendment sent")
            )
          }
        >
          <Textarea
            rows={3}
            value={am.after}
            onChange={(e) => setAm({ ...am, after: e.target.value })}
          />
          <Input
            placeholder={t("common.reason", "Reason")}
            value={am.reason}
            onChange={(e) => setAm({ ...am, reason: e.target.value })}
          />
        </FormDialog>
      )}
    </div>
  )
}

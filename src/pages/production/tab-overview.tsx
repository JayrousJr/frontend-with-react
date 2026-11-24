import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarClockIcon, PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import {
  fetchConflicts,
  requestScheduleChange,
  scheduleProduction,
  startPreparation,
  type Production,
} from "@/services/production"
import { Conflicts, FormDialog, Info, Section, SimpleTable } from "./ui"
import { fromLocal, toLocal, useLoad } from "./utils"

type Sched = {
  startAt: string
  endAt: string
  setupAt: string
  breakdownAt: string
  reason: string
}

export function OverviewTab({
  p,
  onChange,
  reload,
}: {
  p: Production
  onChange: (p: Production) => void
  reload: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [dialog, setDialog] = useState<null | "schedule" | "change">(null)
  const [s, setS] = useState<Sched>({
    startAt: toLocal(p.startAt),
    endAt: toLocal(p.endAt),
    setupAt: toLocal(p.setupAt ?? p.startAt),
    breakdownAt: toLocal(p.breakdownAt ?? p.endAt),
    reason: "",
  })
  const showConflicts = !["DRAFT", "CANCELLED", "CLOSED", "REJECTED"].includes(
    p.status
  )
  const conflicts = useLoad(
    () => (showConflicts ? fetchConflicts(p.uniqueId) : Promise.resolve([])),
    [p.uniqueId, p.status, p.startAt]
  )
  const body = () => ({
    startAt: fromLocal(s.startAt) ?? "",
    endAt: fromLocal(s.endAt) ?? "",
    setupAt: fromLocal(s.setupAt),
    breakdownAt: fromLocal(s.breakdownAt),
    venues: p.venues.map((v) =>
      v.venueId
        ? { venueId: v.venueId }
        : { name: v.name, location: v.location }
    ),
  })
  return (
    <div className="space-y-6">
      <Section
        title={t("productions.details", "Details")}
        actions={
          <>
            {p.can.schedule && (
              <Button size="sm" onClick={() => setDialog("schedule")}>
                <CalendarClockIcon />
                {t("productions.schedule", "Schedule")}
              </Button>
            )}
            {p.can.startPreparation && (
              <Button
                size="sm"
                onClick={() =>
                  run(
                    async () => onChange(await startPreparation(p.uniqueId)),
                    t("productions.preparing", "Preparation started")
                  )
                }
              >
                <PlayIcon />
                {t("productions.start_preparation", "Start preparation")}
              </Button>
            )}
            {p.can.requestChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog("change")}
              >
                <CalendarClockIcon />
                {t("productions.request_change", "Request schedule change")}
              </Button>
            )}
          </>
        }
      >
        <Info
          items={[
            [t("productions.category", "Category"), p.category],
            [t("productions.producer", "Producer"), p.producer],
            [t("productions.department", "Department"), p.department],
            [
              t("productions.setup", "Setup"),
              p.setupAt ? formatStamp(p.setupAt) : null,
            ],
            [t("productions.start", "Start"), formatStamp(p.startAt)],
            [t("productions.end", "End"), formatStamp(p.endAt)],
            [
              t("productions.breakdown", "Breakdown"),
              p.breakdownAt ? formatStamp(p.breakdownAt) : null,
            ],
            [
              t("productions.actual_start", "Actual start"),
              p.actualStartAt ? formatStamp(p.actualStartAt) : null,
            ],
            [
              t("productions.actual_end", "Actual end"),
              p.actualEndAt ? formatStamp(p.actualEndAt) : null,
            ],
            [
              t("productions.venues", "Venues"),
              p.venues
                .map((v) => `${v.name}${v.location ? ` (${v.location})` : ""}`)
                .join("; "),
            ],
            [
              t("productions.departments", "Departments"),
              p.departments.map((d) => d.name).join(", "),
            ],
            [
              t("productions.readiness_override", "Readiness override"),
              p.readinessOverride,
            ],
          ]}
        />
        {(p.description || p.objectives) && (
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            {p.description && (
              <div>
                <div className="text-muted-foreground">
                  {t("productions.description", "Description")}
                </div>
                <p className="whitespace-pre-wrap">{p.description}</p>
              </div>
            )}
            {p.objectives && (
              <div>
                <div className="text-muted-foreground">
                  {t("productions.objectives", "Objectives")}
                </div>
                <p className="whitespace-pre-wrap">{p.objectives}</p>
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("productions.crew", "Crew numbers and roles")}>
          <SimpleTable
            head={[
              t("productions.department", "Department"),
              t("productions.role", "Role"),
              t("productions.quantity", "Qty"),
              t("common.note", "Note"),
            ]}
            rows={p.crew.map((c) => [
              c.department,
              c.crewRole,
              c.quantity,
              c.note ?? "",
            ])}
          />
        </Section>
        <Section title={t("productions.equipment", "Preliminary equipment")}>
          <SimpleTable
            head={[
              t("productions.category", "Category"),
              t("productions.quantity", "Qty"),
              t("common.note", "Note"),
            ]}
            rows={p.equipment.map((e) => [
              e.category,
              e.quantity,
              e.note ?? "",
            ])}
          />
        </Section>
      </div>

      {showConflicts && (
        <Section
          title={t("productions.conflicts", "Scheduling conflicts")}
          description={t(
            "productions.conflicts_hint",
            "Venues, staff (assignments, status, unavailability), equipment bookings and vehicles in the same period."
          )}
        >
          <Conflicts
            items={conflicts.data ?? []}
            empty={t("productions.no_conflicts", "No conflicts.")}
          />
        </Section>
      )}

      {p.scheduleChanges.length > 0 && (
        <Section title={t("productions.schedule_changes", "Schedule changes")}>
          <SimpleTable
            head={[
              t("common.date", "Date"),
              t("productions.change", "Change"),
              t("common.reason", "Reason"),
              t("common.by", "By"),
              t("common.status", "Status"),
            ]}
            rows={p.scheduleChanges.map((c) => [
              formatStamp(c.createdAt),
              <span className="text-xs">
                {formatStamp(String(c.before.startAt))} →{" "}
                <b>{formatStamp(String(c.after.startAt))}</b>
                {c.conflicts?.length
                  ? ` · ${c.conflicts.length} ${t("productions.conflicts_short", "conflict(s)")}`
                  : ""}
              </span>,
              c.reason,
              c.requestedBy,
              <ToneBadge code={c.status} />,
            ])}
          />
        </Section>
      )}

      <Section title={t("productions.history", "History")}>
        <ul className="space-y-1 text-sm">
          {p.history.map((h, i) => (
            <li key={i} className="flex flex-wrap gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">
                {formatStamp(h.at)}
              </span>
              <span>{h.text}</span>
              <span className="text-muted-foreground">
                — {h.by}
                {h.department ? ` (${h.department})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {dialog && (
        <FormDialog
          title={
            dialog === "schedule"
              ? t("productions.schedule", "Schedule")
              : t("productions.request_change", "Request schedule change")
          }
          description={
            dialog === "schedule"
              ? t(
                  "productions.schedule_hint",
                  "Confirm the times with setup and breakdown. The readiness checklist is created."
                )
              : t(
                  "productions.change_hint",
                  "The Production Manager approves the change; affected departments and crew are notified."
                )
          }
          confirmLabel={
            dialog === "schedule"
              ? t("productions.schedule", "Schedule")
              : t("productions.send_change", "Send for approval")
          }
          canConfirm={
            !!s.startAt &&
            !!s.endAt &&
            (dialog === "schedule" || !!s.reason.trim())
          }
          onClose={() => setDialog(null)}
          onConfirm={() =>
            dialog === "schedule"
              ? run(
                  async () =>
                    onChange(await scheduleProduction(p.uniqueId, body())),
                  t("productions.scheduled", "Scheduled")
                )
              : run(
                  async () => {
                    const r = await requestScheduleChange(p.uniqueId, {
                      ...body(),
                      reason: s.reason,
                    })
                    reload()
                    return r
                  },
                  t("productions.change_sent", "Change sent for approval")
                )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("productions.setup", "Setup")}</FieldLabel>
              <Input
                type="datetime-local"
                value={s.setupAt}
                onChange={(e) => setS({ ...s, setupAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("productions.start", "Start")}</FieldLabel>
              <Input
                type="datetime-local"
                value={s.startAt}
                onChange={(e) => setS({ ...s, startAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("productions.end", "End")}</FieldLabel>
              <Input
                type="datetime-local"
                value={s.endAt}
                onChange={(e) => setS({ ...s, endAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("productions.breakdown", "Breakdown")}</FieldLabel>
              <Input
                type="datetime-local"
                value={s.breakdownAt}
                onChange={(e) => setS({ ...s, breakdownAt: e.target.value })}
              />
            </Field>
          </div>
          {dialog === "change" && (
            <Field>
              <FieldLabel>{t("common.reason", "Reason")}</FieldLabel>
              <Textarea
                rows={3}
                value={s.reason}
                onChange={(e) => setS({ ...s, reason: e.target.value })}
              />
            </Field>
          )}
        </FormDialog>
      )}
    </div>
  )
}

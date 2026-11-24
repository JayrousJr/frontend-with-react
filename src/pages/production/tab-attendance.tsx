import { useCallback, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ClipboardEditIcon, QrCodeIcon, UserCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { errorMessage } from "@/services/api"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchAttendance,
  recordAttendance,
  requestAttendanceCorrection,
  scanAttendance,
  type AttendanceSheet,
  type AttendanceStatus,
  type Production,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable, Stat } from "./ui"
import { QrScanner } from "./qr-scanner"
import { clock, eatDay, fromLocal, toLocal, useLoad } from "./utils"

const STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "HALF_DAY",
  "ABSENT",
  "EXCUSED",
  "ON_LEAVE",
]
type Row = AttendanceSheet["crew"][number]
type Rec = {
  status: AttendanceStatus
  checkInAt: string
  checkOutAt: string
  breakMinutes: string
  note: string
  reason: string
}

export function AttendanceTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const [date, setDate] = useState<string | undefined>(undefined)
  const sheet = useLoad(
    () => fetchAttendance(p.uniqueId, date),
    [p.uniqueId, date]
  )
  const [rec, setRec] = useState<{
    row: Row
    mode: "record" | "checkout" | "correct"
    f: Rec
  } | null>(null)
  const [scan, setScan] = useState(false)
  const onCode = useCallback(
    async (code: string) => {
      try {
        const r = await scanAttendance(p.uniqueId, code)
        const label =
          r.action === "CHECK_IN"
            ? "checked in"
            : r.action === "CHECK_OUT"
              ? "checked out"
              : "already checked in and out"
        toast.success(`${r.name}: ${label} ${clock(r.at)}`)
        sheet.reload()
      } catch (e) {
        toast.error(errorMessage(e, "QR code not accepted"))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.uniqueId]
  )
  if (!sheet.data) return <Loading error={sheet.error} />
  const d = sheet.data
  const days = [...new Set([...d.days, d.workDate, eatDay(new Date())])].sort()
  const dayBase = (hhmm: string) => `${d.workDate}T${hhmm}`
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <Field>
          <FieldLabel>{t("attendance.day", "Production day")}</FieldLabel>
          <Input
            type="date"
            value={d.workDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-1">
          {days.map((x) => (
            <Button
              key={x}
              size="sm"
              variant={x === d.workDate ? "default" : "outline"}
              onClick={() => setDate(x)}
            >
              {x}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={withId(ROUTES.BADGES, p.uniqueId)}>
              <QrCodeIcon />
              {t("productions.badges", "QR badges")}
            </Link>
          </Button>
          <Button size="sm" onClick={() => setScan(!scan)}>
            <UserCheckIcon />
            {t("attendance.qr", "QR check-in / out")}
          </Button>
        </div>
      </div>
      {scan && (
        <Section
          title={t("attendance.qr", "QR check-in / out")}
          description={t(
            "attendance.qr_hint",
            "First scan of the day checks in (late after the call time), the second checks out."
          )}
        >
          <QrScanner onCode={onCode} />
        </Section>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat
          label={t("attendance.call", "Call time")}
          value={clock(d.callTime)}
        />
        <Stat
          label={t("attendance.assigned", "Assigned")}
          value={d.totals.assigned}
        />
        <Stat
          label={t("attendance.present", "Present")}
          value={d.totals.present}
          tone="good"
        />
        <Stat
          label={t("attendance.late", "Late")}
          value={d.totals.late}
          tone={d.totals.late ? "warn" : undefined}
        />
        <Stat
          label={t("attendance.absent", "Absent")}
          value={d.totals.absent}
          tone={d.totals.absent ? "bad" : undefined}
        />
        <Stat
          label={t("attendance.pending", "Not recorded")}
          value={d.totals.pending}
          tone={d.totals.pending ? "warn" : undefined}
        />
        <Stat
          label={t("attendance.hours", "Hours / overtime")}
          value={`${d.totals.hours}`}
          hint={`${d.totals.overtime} h ${t("attendance.ot", "overtime")}`}
        />
      </div>
      <Section title={t("attendance.sheet", "Attendance sheet")}>
        <SimpleTable
          head={[
            t("attendance.crew", "Crew"),
            t("productions.role", "Role"),
            t("common.status", "Status"),
            t("attendance.in_out", "In – out"),
            t("attendance.hours", "Hours"),
            t("attendance.ot", "Overtime"),
            t("attendance.night", "Night"),
            "",
          ]}
          rows={d.crew.map((c) => {
            const r = c.record
            return [
              <span>
                {c.name}
                <span className="block text-xs text-muted-foreground">
                  {c.employeeNumber} · {c.department}
                </span>
              </span>,
              c.role,
              r ? (
                <span className="flex flex-wrap items-center gap-1">
                  <ToneBadge code={r.status} />
                  {r.method === "QR" && (
                    <span className="text-xs text-muted-foreground">QR</span>
                  )}
                  {r.corrections.some((x) => x.status === "PENDING") && (
                    <ToneBadge code="PENDING" />
                  )}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
              r ? `${clock(r.checkInAt)} – ${clock(r.checkOutAt)}` : "",
              r ? r.hours : "",
              r && r.overtimeHours > 0 ? (
                <span>
                  {r.overtimeHours} <ToneBadge code={r.overtimeStatus} />
                </span>
              ) : (
                ""
              ),
              r ? r.nightHours || "" : "",
              c.canRecord && (
                <span className="flex gap-1">
                  {!r && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRec({
                          row: c,
                          mode: "record",
                          f: {
                            status: "PRESENT",
                            checkInAt: toLocal(d.callTime),
                            checkOutAt: "",
                            breakMinutes: "0",
                            note: "",
                            reason: "",
                          },
                        })
                      }
                    >
                      {t("attendance.record", "Record")}
                    </Button>
                  )}
                  {r && !r.checkOutAt && r.checkInAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRec({
                          row: c,
                          mode: "checkout",
                          f: {
                            status: r.status,
                            checkInAt: toLocal(r.checkInAt),
                            checkOutAt: toLocal(new Date().toISOString()),
                            breakMinutes: String(r.breakMinutes),
                            note: "",
                            reason: "",
                          },
                        })
                      }
                    >
                      {t("attendance.check_out", "Check out")}
                    </Button>
                  )}
                  {r && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t("attendance.correct", "Request correction")}
                      onClick={() =>
                        setRec({
                          row: c,
                          mode: "correct",
                          f: {
                            status: r.status,
                            checkInAt: toLocal(r.checkInAt),
                            checkOutAt: toLocal(r.checkOutAt),
                            breakMinutes: String(r.breakMinutes),
                            note: "",
                            reason: "",
                          },
                        })
                      }
                    >
                      <ClipboardEditIcon />
                    </Button>
                  )}
                </span>
              ),
            ]
          })}
          empty={t("attendance.no_crew", "No crew assigned.")}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {t(
            "attendance.rules",
            "Hours only (no pay). Overtime goes to the employee's HOD for approval; corrections too, and the original record is kept."
          )}
        </p>
      </Section>
      {rec && (
        <FormDialog
          title={`${rec.row.name} · ${d.workDate}`}
          description={
            rec.mode === "correct"
              ? t(
                  "attendance.correct_hint",
                  "The HOD of the employee's department approves the correction."
                )
              : undefined
          }
          confirmLabel={
            rec.mode === "correct"
              ? t("attendance.send_correction", "Send correction")
              : t("actions.save", "Save")
          }
          canConfirm={rec.mode !== "correct" || !!rec.f.reason.trim()}
          onClose={() => setRec(null)}
          onConfirm={() =>
            run(
              async () => {
                const f = rec.f
                const none = ["ABSENT", "EXCUSED", "ON_LEAVE"].includes(
                  f.status
                )
                if (rec.mode === "correct") {
                  sheet.set(
                    await requestAttendanceCorrection(
                      rec.row.record!.uniqueId,
                      {
                        status: f.status,
                        checkInAt: none ? null : fromLocal(f.checkInAt),
                        checkOutAt: none ? null : fromLocal(f.checkOutAt),
                        breakMinutes: Number(f.breakMinutes) || 0,
                        reason: f.reason,
                      }
                    )
                  )
                } else {
                  sheet.set(
                    await recordAttendance(p.uniqueId, {
                      employeeId: rec.row.employeeId,
                      workDate: d.workDate,
                      status: f.status,
                      // Check-out completes the record: the stored check-in stays.
                      checkInAt:
                        none || rec.mode === "checkout"
                          ? null
                          : fromLocal(f.checkInAt),
                      checkOutAt: none ? null : fromLocal(f.checkOutAt),
                      breakMinutes:
                        rec.mode === "checkout"
                          ? rec.row.record!.breakMinutes
                          : Number(f.breakMinutes) || 0,
                      note: f.note || null,
                    })
                  )
                }
              },
              t("common.saved", "Saved")
            )
          }
        >
          <NativeSelect
            className="w-full"
            disabled={rec.mode === "checkout"}
            value={rec.f.status}
            onChange={(e) =>
              setRec({
                ...rec,
                f: { ...rec.f, status: e.target.value as AttendanceStatus },
              })
            }
          >
            {STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`codes.${s}`, s)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {!["ABSENT", "EXCUSED", "ON_LEAVE"].includes(rec.f.status) && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t("attendance.in", "Check-in")}</FieldLabel>
                <Input
                  type="datetime-local"
                  disabled={rec.mode === "checkout"}
                  value={rec.f.checkInAt || dayBase("08:00")}
                  onChange={(e) =>
                    setRec({
                      ...rec,
                      f: { ...rec.f, checkInAt: e.target.value },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t("attendance.out", "Check-out")}</FieldLabel>
                <Input
                  type="datetime-local"
                  value={rec.f.checkOutAt}
                  onChange={(e) =>
                    setRec({
                      ...rec,
                      f: { ...rec.f, checkOutAt: e.target.value },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t("attendance.break", "Break (min)")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  disabled={rec.mode === "checkout"}
                  value={rec.f.breakMinutes}
                  onChange={(e) =>
                    setRec({
                      ...rec,
                      f: { ...rec.f, breakMinutes: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
          )}
          {rec.mode === "record" && (
            <Textarea
              rows={2}
              placeholder={t(
                "attendance.note",
                "Explanation (lateness, absence…)"
              )}
              value={rec.f.note}
              onChange={(e) =>
                setRec({ ...rec, f: { ...rec.f, note: e.target.value } })
              }
            />
          )}
          {rec.mode === "correct" && (
            <Textarea
              rows={2}
              placeholder={t("common.reason", "Reason")}
              value={rec.f.reason}
              onChange={(e) =>
                setRec({ ...rec, f: { ...rec.f, reason: e.target.value } })
              }
            />
          )}
        </FormDialog>
      )}
    </div>
  )
}

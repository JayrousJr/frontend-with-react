import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { api } from "@/services/api"
import { fetchAttendanceRecords, fetchConfig } from "@/services/production"
import { Loading, Section, SimpleTable, Stat } from "./ui"
import { useLoad } from "./utils"

/** Module 15: attendance and hours across productions (hours only). */
const AttendancePage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const cfg = useLoad(fetchConfig)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [mine, setMine] = useState(false)
  const rows = useLoad(
    () =>
      fetchAttendanceRecords({
        from: from || undefined,
        to: to || undefined,
        status,
        departmentId: departmentId ? Number(departmentId) : undefined,
        mine,
      }),
    [from, to, status, departmentId, mine]
  )
  const list = rows.data ?? []
  const excel = () =>
    run(async () => {
      const r = await api.get<Blob>("/reports/attendance-hours", {
        params: {
          from: from || undefined,
          to: to || undefined,
          status: status || undefined,
        },
        responseType: "blob",
      })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(r.data)
      a.download = `attendance-hours-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
    })
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendance.title", "Attendance and hours")}
        description={t(
          "attendance.subtitle",
          "Hours, overtime and night hours per employee and production day — for HR / payroll export. No pay is calculated."
        )}
        actions={
          <Button variant="outline" onClick={excel}>
            <DownloadIcon />
            {t("attendance.excel", "Excel for HR / payroll")}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-44"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          className="w-44"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("common.all_statuses", "All statuses")}
          </NativeSelectOption>
          {["PRESENT", "LATE", "HALF_DAY", "ABSENT", "EXCUSED", "ON_LEAVE"].map(
            (s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`codes.${s}`, s)}
              </NativeSelectOption>
            )
          )}
        </NativeSelect>
        <NativeSelect
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("productions.all_departments", "All departments")}
          </NativeSelectOption>
          {cfg.data?.departments.map((d) => (
            <NativeSelectOption key={d.id} value={String(d.id)}>
              {d.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant={mine ? "default" : "outline"}
          onClick={() => setMine(!mine)}
        >
          {t("attendance.mine", "My attendance")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={t("attendance.records", "Records")} value={list.length} />
        <Stat
          label={t("attendance.hours", "Hours")}
          value={list.reduce((s, r) => s + r.hours, 0).toFixed(1)}
        />
        <Stat
          label={t("attendance.ot_approved", "Approved overtime")}
          value={list
            .filter((r) => r.overtimeStatus === "APPROVED")
            .reduce((s, r) => s + r.overtimeHours, 0)
            .toFixed(1)}
        />
        <Stat
          label={t("attendance.ot_pending", "Overtime pending")}
          value={list.filter((r) => r.overtimeStatus === "PENDING").length}
          tone="warn"
        />
        <Stat
          label={t("attendance.late_absent", "Late / absent")}
          value={`${list.filter((r) => r.status === "LATE").length} / ${list.filter((r) => r.status === "ABSENT").length}`}
        />
      </div>
      <Section title={t("attendance.records", "Records")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("common.date", "Date"),
              t("unavailability.employee", "Employee"),
              t("productions.department", "Department"),
              t("productions.production", "Production"),
              t("common.status", "Status"),
              t("attendance.in_out", "In – out"),
              t("attendance.hours", "Hours"),
              t("attendance.ot", "Overtime"),
              t("attendance.night", "Night"),
            ]}
            rows={list.map((r) => [
              formatDay(r.workDate),
              `${r.employee} (${r.employeeNumber})`,
              r.department,
              <Link
                className="underline"
                to={`${withId(ROUTES.PRODUCTION_DETAILS, r.productionUniqueId)}?tab=attendance`}
              >
                {r.production}
              </Link>,
              <ToneBadge code={r.status} />,
              r.checkInAt
                ? `${formatStamp(r.checkInAt)} – ${r.checkOutAt ? formatStamp(r.checkOutAt).slice(-5) : "…"}`
                : "",
              r.hours,
              r.overtimeHours ? (
                <span>
                  {r.overtimeHours} <ToneBadge code={r.overtimeStatus} />
                </span>
              ) : (
                ""
              ),
              r.nightHours || "",
            ])}
            empty={t("attendance.none", "No attendance recorded.")}
          />
        )}
      </Section>
    </div>
  )
}

export default AttendancePage

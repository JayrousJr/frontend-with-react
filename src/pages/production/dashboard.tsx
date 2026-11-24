import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { useCodeLabel } from "@/components/app/use-code-label"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchConfig, fetchDashboard } from "@/services/production"
import { Bar, Loading, Section, SimpleTable, Stat } from "./ui"
import { useLoad } from "./utils"

function Chart({
  data,
  x,
  y,
}: {
  data: Record<string, unknown>[]
  x: string
  y: string
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={x}
            tick={{ fontSize: 11 }}
            interval={0}
            angle={data.length > 6 ? -30 : 0}
            textAnchor={data.length > 6 ? "end" : "middle"}
            height={data.length > 6 ? 60 : 30}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <RBar dataKey={y} fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Counts({ data }: { data: Record<string, number> }) {
  const label = useCodeLabel()
  const e = Object.entries(data)
  if (!e.length) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <ul className="grid grid-cols-2 gap-x-4 text-sm">
      {e.map(([k, v]) => (
        <li key={k} className="flex justify-between border-b py-1">
          <span>{label(k)}</span>
          <span className="font-medium tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  )
}

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </div>
)

/** Module 14: management dashboard (no financial analytics). */
const DashboardPage = () => {
  const { t } = useTranslation()
  const cfg = useLoad(fetchConfig)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const d = useLoad(
    () =>
      fetchDashboard({
        from: from || undefined,
        to: to || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
      }),
    [from, to, categoryId, departmentId]
  )
  return (
    <div className="space-y-8">
      <PageHeader
        title={t("mgmt.title", "Management dashboard")}
        description={t(
          "mgmt.subtitle",
          "Built from the system's records. Sections follow your permissions. Excel reports are on the Reports page."
        )}
        actions={
          <span className="flex gap-2 print:hidden">
            <Button variant="outline" asChild>
              <Link to={ROUTES.REPORTS}>
                {t("mgmt.reports", "Reports (Excel)")}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              {t("mgmt.print", "Print / PDF")}
            </Button>
          </span>
        }
      />
      <div className="flex flex-wrap gap-2 print:hidden">
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
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("productions.all_categories", "All categories")}
          </NativeSelectOption>
          {cfg.data?.categories.map((c) => (
            <NativeSelectOption key={c.id} value={String(c.id)}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("productions.all_departments", "All departments")}
          </NativeSelectOption>
          {cfg.data?.departments.map((x) => (
            <NativeSelectOption key={x.id} value={String(x.id)}>
              {x.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {!d.data && <Loading error={d.error} />}
      {d.data?.production && (
        <Group title={t("mgmt.productions", "Productions")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat
              label={t("mgmt.total", "In period")}
              value={d.data.production.total}
            />
            <Stat
              label={t("mgmt.pending", "Pending approval")}
              value={d.data.production.pendingApproval}
              tone={d.data.production.pendingApproval ? "warn" : undefined}
            />
            <Stat
              label={t("mgmt.upcoming", "Upcoming")}
              value={d.data.production.upcoming.length}
            />
            <Stat
              label={t("mgmt.ongoing", "Ongoing")}
              value={d.data.production.ongoing}
            />
            <Stat
              label={t("mgmt.completed", "Completed / closed")}
              value={d.data.production.completed}
              tone="good"
            />
            <Stat
              label={t("mgmt.cancelled", "Cancelled")}
              value={d.data.production.cancelled}
            />
            <Stat
              label={t("mgmt.incidents", "Open incidents")}
              value={d.data.production.openIncidents}
              hint={`${d.data.production.criticalIncidents} ${t("mgmt.high", "high/critical")}`}
              tone={d.data.production.criticalIncidents ? "bad" : undefined}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Section title={t("mgmt.trend", "Productions per month")}>
              <Chart data={d.data.production.byMonth} x="month" y="count" />
            </Section>
            <Section title={t("mgmt.by_category", "By category")}>
              <Chart
                data={Object.entries(d.data.production.byCategory).map(
                  ([category, count]) => ({ category, count })
                )}
                x="category"
                y="count"
              />
            </Section>
            <Section title={t("mgmt.venues", "Venue utilisation")}>
              <Chart
                data={d.data.production.venueUtilisation}
                x="venue"
                y="count"
              />
            </Section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title={t("mgmt.by_status", "By status")}
              description={`${d.data.production.rescheduled} ${t("mgmt.rescheduled", "rescheduled")}`}
            >
              <Counts data={d.data.production.byStatus} />
            </Section>
            <Section title={t("mgmt.upcoming_list", "Next productions")}>
              <SimpleTable
                head={[
                  t("productions.production", "Production"),
                  t("productions.start", "Start"),
                ]}
                rows={d.data.production.upcoming.map((u) => [
                  <Link
                    className="underline"
                    to={withId(ROUTES.PRODUCTION_DETAILS, u.uniqueId)}
                  >
                    <span className="font-mono">{u.number}</span> {u.title}
                  </Link>,
                  formatStamp(u.startAt),
                ])}
              />
            </Section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title={t(
                "mgmt.readiness",
                "Readiness of productions in preparation"
              )}
            >
              <div className="space-y-2">
                {d.data.production.readiness.length === 0 && (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {d.data.production.readiness.map((r) => (
                  <div key={r.uniqueId} className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <Link
                        className="underline"
                        to={`${withId(ROUTES.PRODUCTION_DETAILS, r.uniqueId)}?tab=readiness`}
                      >
                        {r.number} {r.title}
                      </Link>
                      <span className="text-muted-foreground tabular-nums">
                        {r.percent}%
                        {r.blocked
                          ? ` · ${r.blocked} ${t("checklist.blocked", "blocked")}`
                          : ""}
                        {r.overdue
                          ? ` · ${r.overdue} ${t("checklist.overdue", "overdue")}`
                          : ""}
                      </span>
                    </div>
                    <Bar percent={r.percent} />
                  </div>
                ))}
              </div>
            </Section>
            <Section title={t("mgmt.departments", "Departmental performance")}>
              <SimpleTable
                head={[
                  t("productions.department", "Department"),
                  t("mgmt.prods", "Productions"),
                  t("mgmt.crew", "Crew filled"),
                  t("mgmt.ready", "Readiness"),
                ]}
                rows={d.data.production.departments.map((x) => [
                  x.department,
                  x.productions,
                  `${x.crewFilled}/${x.crewRequired} (${x.crewPercent}%)`,
                  x.readinessPercent == null ? "—" : `${x.readinessPercent}%`,
                ])}
              />
            </Section>
          </div>
        </Group>
      )}
      {d.data?.equipment && (
        <Group title={t("mgmt.equipment", "Equipment (Store)")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat
              label={t("mgmt.eq_total", "Registered")}
              value={d.data.equipment.total}
            />
            <Stat
              label={t("mgmt.eq_available", "Available")}
              value={d.data.equipment.available}
              tone="good"
            />
            <Stat
              label={t("mgmt.eq_reserved", "Reserved")}
              value={d.data.equipment.reserved}
            />
            <Stat
              label={t("mgmt.eq_out", "At productions")}
              value={d.data.equipment.checkedOut}
            />
            <Stat
              label={t("mgmt.eq_custody", "With employees")}
              value={d.data.equipment.withEmployees}
            />
            <Stat
              label={t("mgmt.eq_maint", "Maintenance")}
              value={d.data.equipment.maintenance}
              tone="warn"
            />
            <Stat
              label={t("mgmt.eq_bad", "Damaged / missing")}
              value={d.data.equipment.damagedOrMissing}
              tone="bad"
              hint={`${d.data.equipment.utilisationPercent}% ${t("mgmt.in_use", "in use")}`}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title={t("mgmt.most_requested", "Most requested categories")}
            >
              <Chart
                data={d.data.equipment.mostRequested}
                x="category"
                y="quantity"
              />
            </Section>
            <Section title={t("mgmt.bookings", "Bookings by status")}>
              <Counts data={d.data.equipment.bookingsByStatus} />
            </Section>
          </div>
        </Group>
      )}
      {d.data?.transport && (
        <Group title={t("mgmt.transport", "Transport")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat
              label={t("mgmt.tr_requests", "Requests")}
              value={d.data.transport.requests}
            />
            <Stat
              label={t("mgmt.tr_pending", "Waiting")}
              value={d.data.transport.pending}
              tone="warn"
            />
            <Stat
              label={t("mgmt.tr_upcoming", "Upcoming trips")}
              value={d.data.transport.upcoming}
            />
            <Stat
              label={t("mgmt.tr_done", "Completed trips")}
              value={d.data.transport.completed}
            />
            <Stat
              label={t("mgmt.tr_km", "Km / fuel")}
              value={d.data.transport.km}
              hint={`${d.data.transport.fuelLitres} L`}
            />
          </div>
          <Section title={t("mgmt.vehicle_use", "Vehicle utilisation")}>
            <SimpleTable
              head={[
                t("transport.vehicle", "Vehicle"),
                t("transport.trips", "Trips"),
                t("transport.km", "Km"),
                t("transport.fuel", "Fuel (litres)"),
              ]}
              rows={d.data.transport.perVehicle.map((v) => [
                v.vehicle,
                v.trips,
                v.km,
                v.litres.toFixed(1),
              ])}
            />
          </Section>
        </Group>
      )}
      {d.data?.procurement && (
        <Group title={t("mgmt.procurement", "Procurement")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={t("mgmt.overdue_lpos", "Overdue LPOs")}
              value={d.data.procurement.overdueLpos}
              tone={d.data.procurement.overdueLpos ? "bad" : undefined}
            />
            <Stat
              label={t("mgmt.deliveries", "Deliveries (GRNs)")}
              value={d.data.procurement.deliveries}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Section title={t("mgmt.prs", "Purchase requests")}>
              <Counts data={d.data.procurement.requestsByStatus} />
            </Section>
            <Section title={t("mgmt.tenders", "Tenders")}>
              <Counts data={d.data.procurement.tendersByStatus} />
            </Section>
            <Section title={t("mgmt.lpos", "LPOs")}>
              <Counts data={d.data.procurement.lposByStatus} />
            </Section>
          </div>
        </Group>
      )}
      {d.data?.store && (
        <Group title={t("mgmt.store", "Store")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label={t("mgmt.on_hand", "Quantity on hand")}
              value={d.data.store.quantityOnHand}
            />
            <Stat
              label={t("mgmt.qty_reserved", "Quantity reserved")}
              value={d.data.store.quantityReserved}
            />
            <Stat
              label={t("mgmt.below_reorder", "Below reorder level")}
              value={d.data.store.belowReorder}
              tone={d.data.store.belowReorder ? "warn" : undefined}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Section title={t("mgmt.transfers", "Transfers")}>
              <Counts data={d.data.store.transfersByStatus} />
            </Section>
            <Section title={t("mgmt.counts", "Stock counts")}>
              <Counts data={d.data.store.countsByStatus} />
            </Section>
            <Section title={t("mgmt.disposals", "Disposals")}>
              <Counts data={d.data.store.disposalsByStatus} />
            </Section>
          </div>
        </Group>
      )}
      {d.data?.handover && (
        <Group title={t("mgmt.handover", "Handover and custody")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label={t("mgmt.in_custody", "Items in custody")}
              value={d.data.handover.itemsInCustody}
              hint={`${d.data.handover.custodians} ${t("mgmt.custodians", "custodians")}`}
            />
            <Stat
              label={t("mgmt.overdue_returns", "Overdue returns")}
              value={d.data.handover.overdueReturns}
              tone={d.data.handover.overdueReturns ? "bad" : undefined}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t("mgmt.by_dept", "Items by department")}>
              <Chart
                data={d.data.handover.byDepartment}
                x="department"
                y="items"
              />
            </Section>
            <Section title={t("mgmt.health", "Condition of items in custody")}>
              <Counts data={d.data.handover.health} />
            </Section>
          </div>
        </Group>
      )}
    </div>
  )
}

export default DashboardPage

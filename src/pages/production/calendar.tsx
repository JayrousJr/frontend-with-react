import { useMemo, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  PRODUCTION_STATUSES,
  fetchCalendar,
  fetchConfig,
  type ProductionRow,
} from "@/services/production"
import { Loading } from "./ui"
import { clock, useLoad } from "./utils"

type View = "month" | "week" | "day" | "agenda"

const covers = (r: ProductionRow, day: Date) => {
  const from = new Date(r.setupAt ?? r.startAt)
  const to = new Date(r.breakdownAt ?? r.endAt)
  return from <= endOfDay(day) && to >= startOfDay(day)
}

function Chip({ r }: { r: ProductionRow }) {
  return (
    <Link
      to={withId(ROUTES.PRODUCTION_DETAILS, r.uniqueId)}
      className="block truncate rounded bg-primary/10 px-1 py-0.5 text-xs hover:bg-primary/20"
      title={`${r.number} ${r.title} · ${r.venues.join(", ")}`}
    >
      <span className="tabular-nums">{clock(r.startAt)}</span> {r.title}
    </Link>
  )
}

const CalendarPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const [view, setView] = useState<View>("month")
  const [cursor, setCursor] = useState(new Date())
  const [categoryId, setCategoryId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [venueId, setVenueId] = useState("")
  const [status, setStatus] = useState("")
  const cfg = useLoad(fetchConfig)
  const range = useMemo(() => {
    if (view === "month")
      return {
        from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      }
    if (view === "week")
      return {
        from: startOfWeek(cursor, { weekStartsOn: 1 }),
        to: endOfWeek(cursor, { weekStartsOn: 1 }),
      }
    if (view === "day")
      return { from: startOfDay(cursor), to: endOfDay(cursor) }
    return { from: startOfDay(cursor), to: endOfDay(addDays(cursor, 60)) }
  }, [view, cursor])
  const rows = useLoad(
    () =>
      fetchCalendar({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        categoryId: categoryId ? Number(categoryId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        venueId: venueId ? Number(venueId) : undefined,
        status: status || undefined,
      }),
    [
      range.from.getTime(),
      range.to.getTime(),
      categoryId,
      departmentId,
      venueId,
      status,
    ]
  )
  const move = (d: -1 | 1) =>
    setCursor(
      view === "month"
        ? addMonths(cursor, d)
        : view === "week"
          ? addWeeks(cursor, d)
          : view === "day"
            ? addDays(cursor, d)
            : addDays(cursor, 30 * d)
    )
  const days: Date[] = []
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) days.push(d)
  const list = rows.data ?? []
  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`
        : view === "day"
          ? format(cursor, "EEEE d MMMM yyyy")
          : `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`
  return (
    <div className="space-y-4">
      <PageHeader
        title={t("calendar.title", "Production calendar")}
        description={t(
          "calendar.subtitle",
          "Approved productions with setup and breakdown. Drafts are not shown."
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => move(-1)}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" onClick={() => setCursor(new Date())}>
          {t("calendar.today", "Today")}
        </Button>
        <Button size="icon" variant="outline" onClick={() => move(1)}>
          <ChevronRightIcon />
        </Button>
        <span className="font-medium">{title}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {(["month", "week", "day", "agenda"] as View[]).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
            >
              {t(`calendar.${v}`, v[0].toUpperCase() + v.slice(1))}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
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
          {cfg.data?.departments.map((d) => (
            <NativeSelectOption key={d.id} value={String(d.id)}>
              {d.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("calendar.all_venues", "All venues")}
          </NativeSelectOption>
          {cfg.data?.venues.map((v) => (
            <NativeSelectOption key={v.id} value={String(v.id)}>
              {v.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("common.all_statuses", "All statuses")}
          </NativeSelectOption>
          {PRODUCTION_STATUSES.filter((s) => s !== "DRAFT").map((s) => (
            <NativeSelectOption key={s} value={s}>
              {label(s)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {!rows.data && <Loading error={rows.error} />}
      {rows.data && view === "month" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 border-t border-l text-sm">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="border-r border-b bg-muted px-2 py-1 text-xs font-medium"
              >
                {d}
              </div>
            ))}
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={`min-h-24 space-y-1 border-r border-b p-1 ${isSameMonth(d, cursor) ? "" : "bg-muted/40 text-muted-foreground"}`}
              >
                <button
                  type="button"
                  className={`text-xs ${isSameDay(d, new Date()) ? "rounded bg-primary px-1 text-primary-foreground" : ""}`}
                  onClick={() => {
                    setCursor(d)
                    setView("day")
                  }}
                >
                  {format(d, "d")}
                </button>
                {list
                  .filter((r) => covers(r, d))
                  .map((r) => (
                    <Chip key={r.uniqueId} r={r} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {rows.data && view === "week" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {days.map((d) => (
              <Card key={d.toISOString()} className="py-2">
                <CardContent className="space-y-1 px-2">
                  <div
                    className={`text-xs font-medium ${isSameDay(d, new Date()) ? "text-primary" : ""}`}
                  >
                    {format(d, "EEE d MMM")}
                  </div>
                  {list
                    .filter((r) => covers(r, d))
                    .map((r) => (
                      <Chip key={r.uniqueId} r={r} />
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {rows.data && (view === "day" || view === "agenda") && (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {(view === "day"
              ? days
              : days.filter((d) => list.some((r) => covers(r, d)))
            ).map((d) => {
              const items = list.filter((r) => covers(r, d))
              return (
                <div key={d.toISOString()} className="px-4 py-3">
                  {view === "agenda" && (
                    <div className="mb-1 text-sm font-medium">
                      {format(d, "EEEE d MMMM")}
                    </div>
                  )}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("calendar.nothing", "No productions.")}
                    </p>
                  )}
                  {items.map((r) => (
                    <Link
                      key={r.uniqueId}
                      to={withId(ROUTES.PRODUCTION_DETAILS, r.uniqueId)}
                      className="block rounded py-1 hover:bg-muted"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground tabular-nums">
                          {clock(r.setupAt ?? r.startAt)} / {clock(r.startAt)} –{" "}
                          {clock(r.endAt)}
                        </span>
                        <span className="font-mono">{r.number}</span>
                        <span className="font-medium">{r.title}</span>
                        <ToneBadge code={r.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.category} · {r.venues.join(", ") || "—"} ·{" "}
                        {r.departments.join(", ")} · {r.producer}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
            {view === "agenda" && !list.length && (
              <p className="p-4 text-sm text-muted-foreground">
                {t("calendar.nothing", "No productions.")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CalendarPage

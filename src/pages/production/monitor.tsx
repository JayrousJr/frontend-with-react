import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchMonitor } from "@/services/production"
import { Loading, Section, SimpleTable, Stat } from "./ui"
import { useLoad } from "./utils"

/** Module 11: ongoing productions and today's starts. */
const MonitorPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(fetchMonitor)
  const list = rows.data ?? []
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("monitor.title", "Production monitoring")}
        description={t(
          "monitor.subtitle",
          "Productions in progress, on hold or delayed, and those starting within 24 hours."
        )}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t("codes.IN_PROGRESS", "In progress")}
          value={list.filter((x) => x.status === "IN_PROGRESS").length}
        />
        <Stat
          label={t("monitor.held", "On hold / delayed")}
          value={
            list.filter((x) => ["ON_HOLD", "DELAYED"].includes(x.status)).length
          }
          tone="warn"
        />
        <Stat
          label={t("monitor.starting", "Starting soon")}
          value={
            list.filter((x) =>
              ["READY", "PREPARING", "SCHEDULED"].includes(x.status)
            ).length
          }
        />
        <Stat
          label={t("monitor.critical", "Critical incidents open")}
          value={list.reduce((s, x) => s + x.criticalIncidents, 0)}
          tone="bad"
        />
      </div>
      <Section title={t("monitor.board", "Board")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("productions.production", "Production"),
              t("common.status", "Status"),
              t("productions.start", "Start"),
              t("productions.actual_start", "Actual start"),
              t("productions.venues", "Venues"),
              t("productions.producer", "Producer"),
              t("monitor.incidents", "Open incidents"),
            ]}
            rows={list.map((x) => [
              <Link
                className="underline"
                to={`${withId(ROUTES.PRODUCTION_DETAILS, x.uniqueId)}?tab=execution`}
              >
                <span className="font-mono">{x.number}</span> {x.title}
              </Link>,
              <ToneBadge code={x.status} />,
              formatStamp(x.startAt),
              x.actualStartAt ? formatStamp(x.actualStartAt) : "—",
              x.venues.join(", "),
              x.producer,
              x.openIncidents ? (
                <span
                  className={
                    x.criticalIncidents ? "font-medium text-destructive" : ""
                  }
                >
                  {x.openIncidents}
                  {x.criticalIncidents
                    ? ` (${x.criticalIncidents} ${t("monitor.high", "high/critical")})`
                    : ""}
                </span>
              ) : (
                "0"
              ),
            ])}
            empty={t("monitor.none", "Nothing running or starting soon.")}
          />
        )}
      </Section>
    </div>
  )
}

export default MonitorPage

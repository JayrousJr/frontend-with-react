import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchCrewOverview } from "@/services/production"
import { Bar, Loading, Section } from "./ui"
import { useLoad } from "./utils"

/** Module 03: crew required vs assigned across productions. */
const CrewOverviewPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(fetchCrewOverview)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("crew_overview.title", "Crew overview")}
        description={t(
          "crew_overview.subtitle",
          "Departments that have not completed their crew allocation are shown in amber."
        )}
      />
      {!rows.data && <Loading error={rows.error} />}
      {rows.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("crew_overview.none", "No productions in planning.")}
        </p>
      )}
      {rows.data?.map((p) => (
        <Section
          key={p.uniqueId}
          title={
            <Link
              className="underline"
              to={`${withId(ROUTES.PRODUCTION_DETAILS, p.uniqueId)}?tab=crew`}
            >
              <span className="font-mono">{p.number}</span> {p.title}
            </Link>
          }
          description={formatStamp(p.startAt)}
          actions={<ToneBadge code={p.status} />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.departments.map((d) => (
              <div key={d.departmentId} className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span
                    className={
                      d.complete ? "" : "text-amber-700 dark:text-amber-400"
                    }
                  >
                    {d.department}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {d.filled}/{d.required}
                    {d.pending
                      ? ` (+${d.pending} ${t("crew_overview.pending", "pending")})`
                      : ""}
                  </span>
                </div>
                <Bar
                  percent={d.required ? (d.filled / d.required) * 100 : 100}
                />
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}

export default CrewOverviewPage

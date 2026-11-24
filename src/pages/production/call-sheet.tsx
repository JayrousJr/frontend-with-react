import { useParams, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { MailIcon, PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import {
  fetchCallSheet,
  fetchProduction,
  sendCallSheets,
} from "@/services/production"
import { Info, Loading, Section, SimpleTable } from "./ui"
import { duration, useLoad } from "./utils"

/** Call sheet per production or department (print / PDF, email to crew). */
const CallSheetPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const [params] = useSearchParams()
  const departmentId = params.get("departmentId")
    ? Number(params.get("departmentId"))
    : undefined
  const s = useLoad(
    () => fetchCallSheet(uniqueId, departmentId),
    [uniqueId, departmentId]
  )
  const p = useLoad(() => fetchProduction(uniqueId), [uniqueId])
  if (!s.data) return <Loading error={s.error} />
  const d = s.data
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span>
            {t("callsheet.title", "Call sheet")} ·{" "}
            <span className="font-mono">{d.number}</span> {d.title}
          </span>
        }
        description={
          d.department
            ? `${t("productions.department", "Department")}: ${d.department}`
            : t("callsheet.all", "All departments")
        }
        actions={
          <span className="flex gap-2 print:hidden">
            {p.data?.can && p.data.isProducer && (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    async () => {
                      const r = await sendCallSheets(uniqueId)
                      return r
                    },
                    t(
                      "callsheet.sent",
                      "Call sheets issued (in the system, or by email for crew without a login)"
                    )
                  )
                }
              >
                <MailIcon />
                {t("callsheet.send", "Issue to crew")}
              </Button>
            )}
            <Button onClick={() => window.print()}>
              <PrinterIcon />
              {t("actions.print", "Print / PDF")}
            </Button>
          </span>
        }
      />
      <Section title={t("callsheet.production", "Production")}>
        <Info
          items={[
            [t("productions.category", "Category"), d.category],
            [t("productions.producer", "Producer"), d.producer],
            [
              t("productions.setup", "Setup"),
              d.setupAt ? formatStamp(d.setupAt) : null,
            ],
            [t("productions.start", "Start"), formatStamp(d.startAt)],
            [t("productions.end", "End"), formatStamp(d.endAt)],
            [
              t("productions.breakdown", "Breakdown"),
              d.breakdownAt ? formatStamp(d.breakdownAt) : null,
            ],
            [
              t("productions.venues", "Venues"),
              d.venues
                .map((v) => `${v.name}${v.location ? ` (${v.location})` : ""}`)
                .join("; "),
            ],
          ]}
        />
      </Section>
      <Section title={t("callsheet.crew", "Crew")}>
        <SimpleTable
          head={[
            t("productions.department", "Department"),
            t("productions.role", "Role"),
            t("callsheet.name", "Name"),
            t("callsheet.phone", "Phone"),
            t("callsheet.email", "Email"),
          ]}
          rows={d.crew.map((c) => [
            c.department,
            c.role,
            c.name,
            c.phone,
            c.email,
          ])}
          empty={t("callsheet.no_crew", "No crew assigned yet.")}
        />
      </Section>
      <Section title={t("callsheet.transport", "Transport")}>
        <SimpleTable
          head={[
            t("transport.trip", "Trip"),
            t("transport.route_short", "From → to"),
            t("transport.depart", "Departure"),
            t("transport.return", "Return"),
            t("transport.vehicle", "Vehicle"),
            t("transport.driver", "Driver"),
          ]}
          rows={d.transport.map((x) => [
            x.number,
            `${x.pickup} → ${x.destination}`,
            formatStamp(x.departAt),
            formatStamp(x.returnAt),
            x.vehicle,
            `${x.driver} ${x.driverPhone}`,
          ])}
          empty={t("callsheet.no_transport", "No confirmed transport.")}
        />
      </Section>
      {d.runningOrder && (
        <Section
          title={t("callsheet.ro", "Running order (version {{v}})", {
            v: d.runningOrder.version,
          })}
        >
          <SimpleTable
            head={[
              "#",
              t("ro.segment", "Segment"),
              t("ro.duration", "Duration"),
            ]}
            rows={d.runningOrder.items.map((i) => [
              i.seq,
              i.title,
              duration(i.durationSec),
            ])}
          />
        </Section>
      )}
      <p className="text-xs text-muted-foreground">
        {t("callsheet.generated", "Generated")} {formatStamp(d.generatedAt)}
      </p>
    </div>
  )
}

export default CallSheetPage

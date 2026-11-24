import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchMyBadge, fetchMyProductions } from "@/services/production"
import { Loading, Section, SimpleTable } from "./ui"
import { QrImage } from "./qr-image"
import { useLoad } from "./utils"

/** Crew view: my assignments, call sheets and personal QR badge. */
const MyProductionsPage = () => {
  const { t } = useTranslation()
  const mine = useLoad(fetchMyProductions)
  const badge = useLoad(fetchMyBadge)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("my_productions.title", "My productions")}
        description={t(
          "my_productions.subtitle",
          "Productions you are assigned to or produce, with their call sheets."
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <Section title={t("my_productions.assigned", "Assigned to me")}>
            {!mine.data ? (
              <Loading error={mine.error} />
            ) : (
              <SimpleTable
                head={[
                  t("productions.production", "Production"),
                  t("productions.role", "Role"),
                  t("productions.start", "Start"),
                  t("productions.venues", "Venues"),
                  t("common.status", "Status"),
                  "",
                ]}
                rows={mine.data.assignments.map((a) => [
                  <Link
                    className="underline"
                    to={withId(ROUTES.PRODUCTION_DETAILS, a.productionUniqueId)}
                  >
                    <span className="font-mono">{a.number}</span> {a.title}
                  </Link>,
                  a.role,
                  formatStamp(a.setupAt ?? a.startAt),
                  a.venues.join(", "),
                  <ToneBadge code={a.status} />,
                  <Link
                    className="text-xs underline"
                    to={withId(ROUTES.CALL_SHEET, a.productionUniqueId)}
                  >
                    {t("productions.call_sheet", "Call sheet")}
                  </Link>,
                ])}
                empty={t("my_productions.none", "No assignments.")}
              />
            )}
          </Section>
          {mine.data && mine.data.produced.length > 0 && (
            <Section title={t("my_productions.produced", "I produce")}>
              <SimpleTable
                head={[
                  t("productions.production", "Production"),
                  t("productions.start", "Start"),
                  t("productions.venues", "Venues"),
                  t("common.status", "Status"),
                ]}
                rows={mine.data.produced.map((a) => [
                  <Link
                    className="underline"
                    to={withId(ROUTES.PRODUCTION_DETAILS, a.productionUniqueId)}
                  >
                    <span className="font-mono">{a.number}</span> {a.title}
                  </Link>,
                  formatStamp(a.startAt),
                  a.venues.join(", "),
                  <ToneBadge code={a.status} />,
                ])}
              />
            </Section>
          )}
        </div>
        <Section
          title={t("my_productions.badge", "My attendance QR")}
          description={t(
            "my_productions.badge_hint",
            "Show it to the producer or HOD at the venue."
          )}
          actions={
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
            </Button>
          }
        >
          {!badge.data ? (
            <Loading error={badge.error} />
          ) : (
            <div className="flex flex-col items-center text-center">
              <QrImage text={badge.data.qr} size={200} />
              <div className="mt-2 font-semibold">{badge.data.name}</div>
              <div className="text-xs text-muted-foreground">
                {badge.data.employeeNumber} · {badge.data.jobTitle} ·{" "}
                {badge.data.department}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

export default MyProductionsPage

import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app/page-header"
import { fetchBadges, fetchProduction } from "@/services/production"
import { Loading } from "./ui"
import { QrImage } from "./qr-image"
import { useLoad } from "./utils"

/** Printable personal QR badges of a production's crew. */
const BadgesPage = () => {
  const { t } = useTranslation()
  const { uniqueId = "" } = useParams()
  const p = useLoad(() => fetchProduction(uniqueId), [uniqueId])
  const b = useLoad(() => fetchBadges(uniqueId), [uniqueId])
  if (!p.data || !b.data) return <Loading error={p.error ?? b.error} />
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={t("badges.title", "QR badges — {{n}}", { n: p.data.number })}
          description={t(
            "badges.hint",
            "Personal codes: the same badge works on every production. Producers and HODs scan them at the venue (Attendance tab)."
          )}
          actions={
            <Button onClick={() => window.print()}>
              <PrinterIcon />
              {t("actions.print", "Print")}
            </Button>
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {b.data.map((x) => (
          <div
            key={x.employeeNumber}
            className="flex break-inside-avoid flex-col items-center rounded-lg border p-4 text-center"
          >
            <div className="text-xs font-semibold tracking-wide">AzamTV</div>
            <QrImage text={x.qr} size={150} />
            <div className="mt-2 font-semibold">{x.name}</div>
            <div className="text-xs text-muted-foreground">
              {x.employeeNumber} · {x.jobTitle}
            </div>
            <div className="text-xs text-muted-foreground">{x.department}</div>
          </div>
        ))}
        {b.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("badges.none", "No crew assigned yet.")}
          </p>
        )}
      </div>
    </div>
  )
}

export default BadgesPage

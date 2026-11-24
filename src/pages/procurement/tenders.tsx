import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchTenders } from "@/services/procurement"
import { Loading } from "./shared"
import { useLoad } from "./shared-utils"

const TendersPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const rows = useLoad(() => fetchTenders())
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tenders.title", "Tenders")}
        description={t(
          "tenders.subtitle",
          "Created by Purchasing from approved request lines (Purchasing page). Committee members see the tenders they sit on."
        )}
      />
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("tenders.none", "No tenders yet.")}
            </p>
          )}
          {rows.data?.map((x) => (
            <Link
              key={x.uniqueId}
              to={withId(ROUTES.TENDER_DETAILS, x.uniqueId)}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{x.number}</span>
                <span>{x.title}</span>
                <ToneBadge code={x.status} />
                {x.isMember && (
                  <span className="text-xs text-muted-foreground">
                    ({t("tenders.member", "committee member")})
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {label(x.route)} · {x.lineCount} {t("tenders.items", "items")} ·{" "}
                {x.invited} {t("tenders.invited", "invited")} ·{" "}
                {x.submittedBids} {t("tenders.bids", "bids")} ·{" "}
                {t("tenders.closes", "closes")} {formatStamp(x.closingAt)}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default TendersPage

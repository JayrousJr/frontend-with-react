import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { portalTenders } from "@/services/portal"
import { Loading } from "../procurement/shared"
import { useLoad } from "../procurement/shared-utils"

const PortalTendersPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(portalTenders)
  return (
    <>
      <h1 className="text-2xl font-semibold">
        {t("portal.tenders", "Tenders")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t(
          "portal.tenders_hint",
          "Tenders you are invited to. Quote the full quantity of each item you choose, against the exact specifications, before the closing time (server time, EAT). Bids stay sealed until the opening."
        )}
      </p>
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("portal.no_tenders", "No invitations yet.")}
            </p>
          )}
          {rows.data?.map((x) => (
            <Link
              key={x.uniqueId}
              to={`/portal/tenders/${x.uniqueId}`}
              className="block px-4 py-3 hover:bg-muted sm:px-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{x.number}</span>
                <span>{x.title}</span>
                <ToneBadge code={x.status} />
                {x.myBid && (
                  <span className="text-xs text-muted-foreground">
                    ({t("portal.my_bid", "my bid")}: {x.myBid.toLowerCase()})
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {x.lineCount} {t("tenders.items", "items")} ·{" "}
                {t("tenders.closes", "closes")} {formatStamp(x.closingAt)}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

export default PortalTendersPage

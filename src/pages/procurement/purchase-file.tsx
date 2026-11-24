import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatStamp, resolveImageUrl } from "@/lib/format"
import { fetchPurchaseFile } from "@/services/procurement"
import { Loading } from "./shared"
import { useLoad } from "./shared-utils"

/** Purchase file: every step, actor, time and document of a purchase (requirements §5). */
export function PurchaseFileCard({
  purchaseRequestUniqueId,
}: {
  purchaseRequestUniqueId: string
}) {
  const { t } = useTranslation()
  const f = useLoad(
    () => fetchPurchaseFile(purchaseRequestUniqueId),
    [purchaseRequestUniqueId]
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("purchase_file.title", "Purchase file")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!f.data ? (
          <Loading error={f.error} />
        ) : (
          <ol className="space-y-2 border-l pl-4 text-sm">
            {f.data.events.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatStamp(e.at)}
                  </span>
                  <Badge variant="secondary">{e.kind}</Badge>
                  {e.link ? (
                    e.kind === "DOCUMENT" ? (
                      <a
                        className="underline"
                        href={resolveImageUrl(e.link)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {e.title}
                      </a>
                    ) : (
                      <Link className="underline" to={e.link}>
                        {e.title}
                      </Link>
                    )
                  ) : (
                    <span>{e.title}</span>
                  )}
                  {e.actor && (
                    <span className="text-muted-foreground">· {e.actor}</span>
                  )}
                </div>
                {e.detail && (
                  <div className="text-xs text-muted-foreground">
                    {e.detail}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

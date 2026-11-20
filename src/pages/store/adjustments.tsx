import { Link, useLoaderData, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ChevronRightIcon,
  ClipboardListIcon,
  FileSpreadsheetIcon,
  PlusIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { Adjustment } from "@/services/store"

const AdjustmentsPage = () => {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const { user } = useAuth()
  const { adjustments } = useLoaderData() as { adjustments: Adjustment[] }
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "open"
  const shown = adjustments.filter((a) =>
    tab === "open"
      ? a.status === "IN_APPROVAL" ||
        a.status === "RETURNED" ||
        (a.status === "APPROVED" && !a.postedAt)
      : true
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adjustments.title", "Stock adjustments")}
        description={t(
          "adjustments.subtitle",
          "Opening balance, found and donated items and corrections. Nothing changes in stock until Store Managers approve."
        )}
        actions={
          hasPermission(user, P.STOCK_ADJUST) && (
            <>
              <Button variant="outline" asChild>
                <Link to={ROUTES.OPENING_BALANCE}>
                  <FileSpreadsheetIcon />
                  {t("nav.opening_balance", "Opening balance")}
                </Link>
              </Button>
              <Button asChild>
                <Link to={ROUTES.ADJUSTMENT_NEW}>
                  <PlusIcon />
                  {t("adjustments.new", "New adjustment")}
                </Link>
              </Button>
            </>
          )
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="open">
            {t("adjustments.open", "Open")}
          </TabsTrigger>
          <TabsTrigger value="all">{t("adjustments.all", "All")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ClipboardListIcon className="size-8" />
            {t("adjustments.none", "No adjustments here.")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {shown.map((a) => (
              <Link
                key={a.uniqueId}
                to={withId(ROUTES.ADJUSTMENT_DETAILS, a.uniqueId)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{a.number}</span>
                    <span>{label(a.type)}</span>
                    <ToneBadge code={a.status} />
                    {a.status === "APPROVED" && !a.postedAt && (
                      <span className="text-xs text-destructive">
                        {t("adjustments.not_posted", "Not posted")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.store.name} ·{" "}
                    {t(
                      "adjustments.counts",
                      "{{lines}} lines, {{assets}} assets",
                      {
                        lines: a.lineCount,
                        assets: a.assetCount,
                      }
                    )}{" "}
                    · {a.createdBy} · {formatStamp(a.createdAt)}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdjustmentsPage
